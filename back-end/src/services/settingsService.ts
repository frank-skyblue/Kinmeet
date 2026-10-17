import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { findUserByEmail, findUserByUsername, normalizeEmail } from '../utils/email';
import { usernameField } from '../middleware/schemas';
import { USERNAME_TAKEN_MESSAGE, duplicateKeyField } from './authenticationService';


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

        // Same rules and messages as the route's validation, for direct callers.
        const parsed = usernameField.safeParse(newUsername);
        if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);
        const normalized = parsed.data;

        // The user's own username isn't "taken": keeping it is a no-op.
        if (normalized === user.username) return { username: normalized };

        if (await findUserByUsername(normalized)) throw new AppError(409, USERNAME_TAKEN_MESSAGE);

        user.username = normalized;
        try {
            await user.save();
        } catch (error) {
            // Someone claimed it between the check and the save; the unique index stopped this one.
            if (duplicateKeyField(error) === 'username') throw new AppError(409, USERNAME_TAKEN_MESSAGE);
            throw error;
        }

        return { username: normalized };
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
};
