import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

const REGISTER_GENDER_VALUES = ['female', 'male', 'other'] as const;

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

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

const isPasswordSecure = (password: string) => {
    // At least 8 chars, one uppercase, one lowercase, one number (special chars optional)
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password);
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
    user?: {
        id: string;
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        photo?: string;
        profileComplete?: boolean;
    };
}

export const authenticationService = {
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        try {
            const { email, password } = credentials;

            if (!email || !password) {
                return {
                    success: false,
                    message: "Email and password are required"
                };
            }

            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return {
                    success: false,
                    message: "Invalid credentials"
                };
            }

            // Compare password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return {
                    success: false,
                    message: "Invalid credentials"
                };
            }

            const token = jwt.sign(
                { id: user._id.toString(), email: user.email, firstName: user.firstName },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    photo: user.photo,
                    profileComplete: user.profileComplete
                }
            };
        } catch (error) {
            return {
                success: false,
                message: "Authentication failed"
            };
        }
    },

    register: async (data: RegisterData): Promise<LoginResponse> => {
        try {
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

            // Handle both currentLocation object and separate fields
            const province = currentLocation?.province || currentProvince;
            const country = currentLocation?.country || currentCountry;
            const optionalCity =
                typeof currentLocation?.city === 'string' && currentLocation.city.trim() !== ''
                    ? currentLocation.city.trim()
                    : undefined;

            // Validate required fields
            if (
                !email ||
                !password ||
                !firstName ||
                !lastName ||
                !homeCountry ||
                !province ||
                !country ||
                !dateOfBirth ||
                !gender
            ) {
                return {
                    success: false,
                    message: "All required fields must be provided"
                };
            }

            if (!languages || languages.length === 0) {
                return {
                    success: false,
                    message: "At least one language is required"
                };
            }

            if (!lookingFor || lookingFor.length === 0) {
                return {
                    success: false,
                    message: "Please select what you're looking for"
                };
            }

            // Password security check
            if (!isPasswordSecure(password)) {
                return {
                    success: false,
                    message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and optionally a special character."
                };
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Check if user already exists
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                return {
                    success: false,
                    message: DUPLICATE_EMAIL_MESSAGE
                };
            }

            let resolvedUsername: string;
            if (typeof username === 'string' && username.trim() !== '') {
                const normalizedUsername = username.trim().toLowerCase();
                if (!USERNAME_REGEX.test(normalizedUsername)) {
                    return {
                        success: false,
                        message: "Username must be 3-30 characters using lowercase letters, numbers, or underscores"
                    };
                }
                const existingUsername = await User.findOne({ username: normalizedUsername });
                if (existingUsername) {
                    return {
                        success: false,
                        message: "Username is already taken"
                    };
                }
                resolvedUsername = normalizedUsername;
            } else {
                resolvedUsername = await generateUniqueUsername(firstName);
            }

            const dobMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
            if (!dobMatch) {
                return {
                    success: false,
                    message: "Date of birth must be YYYY-MM-DD"
                };
            }
            const dobY = Number(dobMatch[1]);
            const dobMo = Number(dobMatch[2]);
            const dobD = Number(dobMatch[3]);
            const parsedDateOfBirth = new Date(Date.UTC(dobY, dobMo - 1, dobD, 12, 0, 0, 0));
            if (
                parsedDateOfBirth.getUTCFullYear() !== dobY ||
                parsedDateOfBirth.getUTCMonth() !== dobMo - 1 ||
                parsedDateOfBirth.getUTCDate() !== dobD
            ) {
                return {
                    success: false,
                    message: "Invalid date of birth"
                };
            }
            const today = new Date();
            const todayUtcStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
            if (dateOfBirth > todayUtcStr) {
                return {
                    success: false,
                    message: "Invalid date of birth"
                };
            }
            const maxDob = new Date(Date.UTC(
                today.getUTCFullYear() - 120,
                today.getUTCMonth(),
                today.getUTCDate(),
                12, 0, 0, 0,
            ));
            if (parsedDateOfBirth < maxDob) {
                return {
                    success: false,
                    message: "Invalid date of birth"
                };
            }

            if (!REGISTER_GENDER_VALUES.includes(gender as (typeof REGISTER_GENDER_VALUES)[number])) {
                return { success: false, message: 'Invalid gender selection' };
            }

            // Create new user with profile
            const newUser = new User({ 
                email: normalizedEmail, 
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
                profileComplete: true
            });
            
            await newUser.save();

            const token = jwt.sign(
                { id: newUser._id.toString(), email: newUser.email, firstName: newUser.firstName },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return {
                success: true,
                message: "Registration successful",
                token,
                user: {
                    id: newUser._id.toString(),
                    email: newUser.email,
                    username: newUser.username,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    photo: newUser.photo,
                    profileComplete: newUser.profileComplete
                }
            };
        } catch (error) {
            console.error('Registration error:', error);
            if (isDuplicateEmailError(error)) {
                return {
                    success: false,
                    message: DUPLICATE_EMAIL_MESSAGE
                };
            }
            return {
                success: false,
                message: "Registration failed"
            };
        }
    },

    logout: async (token: string): Promise<{ success: boolean; message: string }> => {
        try {
            // TODO: Add actual logout logic here (e.g., blacklist token)
            // For now, we'll simulate a successful logout
            return {
                success: true,
                message: "Logout successful"
            };
        } catch (error) {
            return {
                success: false,
                message: "Logout failed"
            };
        }
    }
};