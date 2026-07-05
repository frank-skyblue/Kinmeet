import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { normalizeEmail, escapeRegExp } from '../utils/email';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const IS_PASSWORD_SECURE = (password: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password);

const findUserByEmail = async (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const exact = await User.findOne({ email: normalized });
    if (exact) return exact;
    return User.findOne({
        email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') },
    });
};

export const settingsService = {
    changeEmail: async (
        userId: string,
        newEmail: string,
        currentPassword: string,
    ): Promise<{ email: string }> => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const passwordMatch = await user.comparePassword(currentPassword);
        if (!passwordMatch) throw new AppError(401, 'Current password is incorrect');

        const normalized = normalizeEmail(newEmail);
        if (!normalized) throw new AppError(400, 'Invalid email address');

        if (normalized === normalizeEmail(user.email)) {
            throw new AppError(400, 'New email must be different from your current email');
        }

        const existing = await findUserByEmail(normalized);
        if (existing) throw new AppError(409, 'This email is already in use');

        user.email = normalized;
        await user.save();

        return { email: user.email };
    },

    changeUsername: async (
        userId: string,
        newUsername: string,
    ): Promise<{ username: string }> => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const normalized = newUsername.trim().toLowerCase();

        if (!USERNAME_REGEX.test(normalized)) {
            throw new AppError(
                400,
                'Username must be 3-30 characters using lowercase letters, numbers, or underscores',
            );
        }

        if (normalized === user.username) {
            throw new AppError(400, 'New username must be different from your current username');
        }

        const existing = await User.findOne({ username: normalized });
        if (existing) throw new AppError(409, 'Username is already taken');

        user.username = normalized;
        await user.save();

        return { username: user.username! };
    },

    changePassword: async (
        userId: string,
        currentPassword: string,
        newPassword: string,
    ): Promise<void> => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const passwordMatch = await user.comparePassword(currentPassword);
        if (!passwordMatch) throw new AppError(401, 'Current password is incorrect');

        if (!IS_PASSWORD_SECURE(newPassword)) {
            throw new AppError(
                400,
                'Password must be at least 8 characters long and include uppercase, lowercase, and a number.',
            );
        }

        if (currentPassword === newPassword) {
            throw new AppError(400, 'New password must be different from your current password');
        }

        user.password = newPassword;
        await user.save();
    },
};
