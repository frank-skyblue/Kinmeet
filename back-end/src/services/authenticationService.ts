import { User, type IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { notifyGroupInBackground } from './newPeopleAlertService';
import { findUserByEmail, normalizeEmail, findUserByUsername } from '../utils/email';

const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Please log in instead.';
export const USERNAME_TAKEN_MESSAGE = 'This username is already taken.';

/** Generated usernames that collide (someone took it a moment earlier) are regenerated this often. */
const GENERATED_USERNAME_ATTEMPTS = 5;

/**
 * Which unique field a MongoDB duplicate-key error (11000) is about. The unique index is what
 * settles two simultaneous claims: only one insert succeeds, the other gets this error.
 */
export const duplicateKeyField = (error: unknown): 'email' | 'username' | null => {
    if (!error || typeof error !== 'object') return null;
    const mongoError = error as {
        code?: number;
        keyPattern?: Record<string, unknown>;
        keyValue?: Record<string, unknown>;
    };
    if (mongoError.code !== 11000) return null;
    if (mongoError.keyPattern?.email ?? mongoError.keyValue?.email) return 'email';
    if (mongoError.keyPattern?.username ?? mongoError.keyValue?.username) return 'username';
    return null;
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
    accountStatus: user.accountStatus ?? 'active',
});

const signAuthToken = (user: IUser) => {
    // tokenVersion is select: false; signing without it would issue a token that is
    // already revoked for anyone whose version has been incremented.
    if (typeof user.tokenVersion !== 'number') {
        throw new Error('signAuthToken requires tokenVersion; select it with +tokenVersion');
    }
    return jwt.sign(
        { id: user._id.toString(), email: user.email, firstName: user.firstName, tv: user.tokenVersion },
        JWT_SECRET,
        { expiresIn: '7d' },
    );
};

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
        const user = await findUserByEmail(email, '+tokenVersion');
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

        const chosenUsername = typeof username === 'string' && username.trim() !== ''
            ? normalizeEmail(username)
            : null;
        if (chosenUsername && await findUserByUsername(chosenUsername)) {
            throw new AppError(409, USERNAME_TAKEN_MESSAGE);
        }

        const [year, month, day] = dateOfBirth.split('-').map(Number);
        const parsedDateOfBirth = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

        for (let attempt = 1; ; attempt += 1) {
            const resolvedUsername = chosenUsername ?? await generateUniqueUsername(firstName);
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
                    groupJoinedAt: new Date(),
                });

                await newUser.save();
                notifyGroupInBackground({ homeCountry: newUser.homeCountry, currentCountry: newUser.currentCountry });

                return {
                    success: true,
                    message: 'Registration successful',
                    token: signAuthToken(newUser),
                    user: authUserPayload(newUser),
                };
            } catch (error) {
                const duplicate = duplicateKeyField(error);
                if (duplicate === 'email') throw new AppError(400, DUPLICATE_EMAIL_MESSAGE);
                if (duplicate === 'username') {
                    // A generated name was taken between checking and saving: pick another.
                    if (!chosenUsername && attempt < GENERATED_USERNAME_ATTEMPTS) continue;
                    throw new AppError(409, USERNAME_TAKEN_MESSAGE);
                }
                throw error;
            }
        }
    },

    checkEmailAvailability: async (
        email: string,
    ): Promise<{ success: true; available: boolean }> => {
        const existingUser = await findUserByEmail(email);
        return { success: true, available: !existingUser };
    },

    /** `username` arrives already validated and normalized (lowercase) by checkUsernameSchema. */
    checkUsernameAvailability: async (
        username: string,
    ): Promise<{ success: true; available: boolean; username: string }> => {
        const existingUser = await findUserByUsername(username);
        return { success: true, available: !existingUser, username };
    },

    logout: async (): Promise<{ success: boolean; message: string }> => ({
        success: true,
        message: 'Logout successful',
    }),
};
