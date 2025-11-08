import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const isPasswordSecure = (password: string) => {
    // At least 8 chars, one uppercase, one lowercase, one number (special chars optional)
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    homeCountry: string;
    currentLocation?: {
        province: string;
        country: string;
    };
    currentProvince?: string;
    currentCountry?: string;
    languages: string[];
    interests: string[];
    lookingFor: string[];
    photo?: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
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

            // Generate JWT token (replace 'your_jwt_secret' with your actual secret)
            const token = jwt.sign(
                { id: user._id.toString(), email: user.email, firstName: user.firstName },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '7d' }
            );

            return {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
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
                password, 
                firstName, 
                lastName, 
                homeCountry, 
                currentLocation,
                currentProvince, 
                currentCountry,
                languages,
                interests,
                lookingFor,
                photo 
            } = data;

            // Handle both currentLocation object and separate fields
            const province = currentLocation?.province || currentProvince;
            const country = currentLocation?.country || currentCountry;

            // Validate required fields
            if (!email || !password || !firstName || !lastName || !homeCountry || !province || !country) {
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

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return {
                    success: false,
                    message: "User already exists"
                };
            }

            // Create new user with profile
            const newUser = new User({ 
                email, 
                password, 
                firstName,
                lastName,
                homeCountry,
                currentProvince: province,
                currentCountry: country,
                languages,
                interests: interests || [],
                lookingFor,
                photo,
                profileComplete: true
            });
            
            await newUser.save();

            // Generate JWT token
            const token = jwt.sign(
                { id: newUser._id.toString(), email: newUser.email, firstName: newUser.firstName },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '7d' }
            );

            return {
                success: true,
                message: "Registration successful",
                token,
                user: {
                    id: newUser._id.toString(),
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    profileComplete: newUser.profileComplete
                }
            };
        } catch (error) {
            console.error('Registration error:', error);
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