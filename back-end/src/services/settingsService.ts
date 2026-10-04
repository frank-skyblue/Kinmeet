import { ACTIVE_ACCOUNT_FILTER, User, type AccountStatus } from '../models/User';
import { AccountEvent } from '../models/AccountEvent';
import { AppError } from '../middleware/errorHandler';
import { findUserByEmail, normalizeEmail } from '../utils/email';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

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

        if (currentPassword === newPassword) {
            throw new AppError(400, 'New password must be different from your current password');
        }

        user.password = newPassword;
        await user.save();
    },

    deactivateAccount: async (userId: string, currentPassword: string): Promise<void> => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const passwordMatch = await user.comparePassword(currentPassword);
        if (!passwordMatch) throw new AppError(401, 'Current password is incorrect');

        // Conditional update so a repeated or concurrent request is a no-op instead of
        // overwriting deactivatedAt or recording a second event.
        const deactivated = await User.findOneAndUpdate(
            { _id: userId, ...ACTIVE_ACCOUNT_FILTER },
            { $set: { accountStatus: 'deactivated', deactivatedAt: new Date() } },
        );
        if (deactivated) {
            await AccountEvent.create({ user: userId, type: 'deactivated' });
        }
    },

    reactivateAccount: async (userId: string): Promise<{ accountStatus: AccountStatus }> => {
        const reactivated = await User.findOneAndUpdate(
            { _id: userId, accountStatus: 'deactivated' },
            { $set: { accountStatus: 'active' }, $unset: { deactivatedAt: 1 } },
        );
        if (reactivated) {
            await AccountEvent.create({ user: userId, type: 'reactivated' });
        } else if (!(await User.exists({ _id: userId }))) {
            throw new AppError(404, 'User not found');
        }

        return { accountStatus: 'active' };
    },
};
