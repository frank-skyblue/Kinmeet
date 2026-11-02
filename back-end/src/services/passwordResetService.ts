import crypto from 'crypto';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { emailService } from './emailService';
import { loginLockoutService } from './loginLockoutService';
import { AppError } from '../middleware/errorHandler';
import { findUserByEmail, normalizeEmail } from '../utils/email';
import { hashEmail, logRedactedFailure, logSecurityEvent } from '../utils/securityLog';
import * as config from '../config/env';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

const stopResetRequest = (step: 'create_token' | 'store_token' | 'send_email', error: unknown): void => {
    logRedactedFailure('password_reset_failed', step, error);
};

export const passwordResetService = {
    // Lookup errors propagate. A missing account and later token or mail failures
    // resolve, so the HTTP response stays the same. Timing can still differ.
    requestPasswordReset: async (email: string): Promise<void> => {
        const normalized = normalizeEmail(email);
        if (!normalized) throw new AppError(400, 'Invalid email address.');

        const user = await findUserByEmail(normalized);
        if (!user) return;

        try {
            await PasswordResetToken.deleteMany({ userId: user._id });
        } catch (error: unknown) {
            stopResetRequest('store_token', error);
            return;
        }

        let rawToken: string;
        try {
            rawToken = crypto.randomBytes(32).toString('hex');
        } catch (error: unknown) {
            stopResetRequest('create_token', error);
            return;
        }

        try {
            await PasswordResetToken.create({
                userId: user._id,
                tokenHash: hashToken(rawToken),
                expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
                used: false,
            });
        } catch (error: unknown) {
            stopResetRequest('store_token', error);
            return;
        }

        try {
            await emailService.sendPasswordResetEmail({
                to: user.email,
                firstName: user.firstName,
                resetLink: `${config.WEB_APP_URL}/reset-password?token=${rawToken}`,
            });
        } catch (error: unknown) {
            stopResetRequest('send_email', error);
        }
    },

    resetPassword: async (rawToken: string, newPassword: string): Promise<void> => {
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

        const releasedLock = await loginLockoutService.releaseForPasswordReset(user.email);
        if (releasedLock) {
            logSecurityEvent({
                type: 'lockout_cleared',
                emailHash: hashEmail(normalizeEmail(user.email)),
                userId: user._id.toString(),
            });
        }

        record.used = true;
        await record.save();
    },
};
