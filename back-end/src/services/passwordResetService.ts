import crypto from 'crypto';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { emailService } from './emailService';
import { AppError } from '../middleware/errorHandler';
import { normalizeEmail } from '../utils/email';
import * as config from '../config/env';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

const hashToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export const passwordResetService = {
    requestPasswordReset: async (email: string): Promise<void> => {
        const normalized = normalizeEmail(email);
        if (!normalized) throw new AppError(400, 'Invalid email address.');

        const user = await User.findOne({ email: normalized });
        if (!user) throw new AppError(404, 'No account found with this email.');

        // Remove any existing (unused or expired) tokens for this user
        await PasswordResetToken.deleteMany({ userId: user._id });

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

        await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt, used: false });

        const resetLink = `${config.WEB_APP_URL}/reset-password?token=${rawToken}`;

        await emailService.sendPasswordResetEmail({
            to: user.email,
            firstName: user.firstName,
            resetLink,
        });
    },

    resetPassword: async (rawToken: string, newPassword: string): Promise<void> => {
        if (!PASSWORD_REGEX.test(newPassword)) {
            throw new AppError(
                400,
                'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
            );
        }

        const tokenHash = hashToken(rawToken);

        const record = await PasswordResetToken.findOne({
            tokenHash,
            used: false,
            expiresAt: { $gt: new Date() },
        });

        if (!record) throw new AppError(400, 'This reset link has expired or is invalid.');

        const user = await User.findById(record.userId);
        if (!user) throw new AppError(404, 'Account not found.');

        user.password = newPassword;
        await user.save();

        record.used = true;
        await record.save();
    },
};
