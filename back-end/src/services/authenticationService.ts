import { User, type IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { findUserByEmail, normalizeEmail } from '../utils/email';

const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Please log in instead.';

const isDuplicateEmailError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const mongoError = error as {
        code?: number;
        keyPattern?: Record<string, unknown>;
        keyValue?: Record<string, unknown>;
    };
    if (mongoError.code !== 11000) return false;
    return Boolean(mongoError.keyPattern?.email ?? mongoError.keyValue?.email);
};

const slugForUsername = (value: string) =>
    value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9_]/g, '');

const generateUniqueUsername = async (firstName: string) => {
    const base = slugForUsername(firstName).slice(0, 26) || 'user';
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = String(Math.floor(1000 + Math.random() * 9000));
        const candidate = `${base}${suffix}`;
        if (!(await User.exists({ username: candidate }))) return candidate;
    }

    return `${base}${Date.now().toString().slice(-4)}`;
};

const authUserPayload = (user: IUser) => ({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photo: user.photo,
    profileComplete: user.profileComplete,
});

const signAuthToken = (user: IUser) =>
    jwt.sign(
        { id: user._id.toString(), email: user.email, firstName: user.firstName },
        JWT_SECRET,
        { expiresIn: '7d' },
    );

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    username?: string;
    password: string;
    firstName: string;
    lastName: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    educationLevel?: string;
    institution?: string;
    graduationYear?: number;
    homeCountry: string;
    currentLocation?: {
        province: string;
        country: string;
        city?: string;
    };
    currentProvince?: string;
    currentCountry?: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
    dateOfBirth: string;
    gender: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: ReturnType<typeof authUserPayload>;
}

export const authenticationService = {
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const { email, password } = credentials;
        const user = await findUserByEmail(email);
        if (!user) throw new AppError(401, 'Invalid credentials');

        const isMatch = await user.comparePassword(password);
        if (!isMatch) throw new AppError(401, 'Invalid credentials');

        return {
            success: true,
            message: 'Login successful',
            token: signAuthToken(user),
            user: authUserPayload(user),
        };
    },

    register: async (data: RegisterData): Promise<LoginResponse> => {
        const {
            email,
            username,
            password,
            firstName,
            lastName,
            about,
            jobTitle,
            company,
            industry,
            educationLevel,
            institution,
            graduationYear,
            homeCountry,
            currentLocation,
            currentProvince,
            currentCountry,
            languages,
            interests,
            lookingFor,
            photo,
            dateOfBirth,
            gender,
        } = data;

        const province = currentLocation?.province || currentProvince;
        const country = currentLocation?.country || currentCountry;
        const optionalCity =
            typeof currentLocation?.city === 'string' && currentLocation.city.trim() !== ''
                ? currentLocation.city.trim()
                : undefined;

        const existingUser = await findUserByEmail(email);
        if (existingUser) throw new AppError(400, DUPLICATE_EMAIL_MESSAGE);

        let resolvedUsername: string;
        if (typeof username === 'string' && username.trim() !== '') {
            const normalizedUsername = username.trim().toLowerCase();
            const existingUsername = await User.findOne({ username: normalizedUsername });
            if (existingUsername) throw new AppError(400, 'Username is already taken');
            resolvedUsername = normalizedUsername;
        } else {
            resolvedUsername = await generateUniqueUsername(firstName);
        }

        const [year, month, day] = dateOfBirth.split('-').map(Number);
        const parsedDateOfBirth = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

        try {
            const newUser = new User({
                email: normalizeEmail(email),
                username: resolvedUsername,
                password,
                firstName,
                lastName,
                dateOfBirth: parsedDateOfBirth,
                gender,
                about: about || undefined,
                jobTitle: jobTitle || undefined,
                company: company || undefined,
                industry: industry || undefined,
                educationLevel: educationLevel || undefined,
                institution: institution || undefined,
                graduationYear: graduationYear || undefined,
                homeCountry,
                currentProvince: province,
                currentCountry: country,
                ...(optionalCity ? { currentCity: optionalCity } : {}),
                languages,
                interests: interests || [],
                lookingFor,
                photo,
                profileComplete: true,
            });

            await newUser.save();

            return {
                success: true,
                message: 'Registration successful',
                token: signAuthToken(newUser),
                user: authUserPayload(newUser),
            };
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                throw new AppError(400, DUPLICATE_EMAIL_MESSAGE);
            }
            throw error;
        }
    },

    checkEmailAvailability: async (
        email: string,
    ): Promise<{ success: true; available: boolean }> => {
        const existingUser = await findUserByEmail(email);
        return { success: true, available: !existingUser };
    },

    logout: async (): Promise<{ success: boolean; message: string }> => ({
        success: true,
        message: 'Logout successful',
    }),
};
