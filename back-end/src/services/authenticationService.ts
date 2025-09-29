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

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
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
                { id: user._id.toString(), email: user.email, name: user.name },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '1d' }
            );

            return {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name
                }
            };
        } catch (error) {
            return {
                success: false,
                message: "Authentication failed"
            };
        }
    },

    register: async (credentials: LoginCredentials & { name?: string, role?: string }): Promise<LoginResponse> => {
        try {
            const { email, password, name, role } = credentials;
            if (!email || !password) {
                return {
                    success: false,
                    message: "Email and password are required"
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
            // Create new user
            const newUser = new User({ email, password, name, role });
            await newUser.save();
            // Generate JWT token
            const token = jwt.sign(
                { id: newUser._id.toString(), email: newUser.email, name: newUser.name, role: newUser.role },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '1d' }
            );
            return {
                success: true,
                message: "Registration successful",
                token,
                user: {
                    id: newUser._id.toString(),
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role
                }
            };
        } catch (error) {
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