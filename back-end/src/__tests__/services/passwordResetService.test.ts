import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ─── Mock dependencies before any imports ────────────────────────────────────

vi.mock('../../models/User', () => ({
    User: {
        findOne: vi.fn(),
        findById: vi.fn(),
    },
}));

vi.mock('../../models/PasswordResetToken', () => ({
    PasswordResetToken: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn(),
    },
}));

// vi.hoisted ensures this fn reference is available when the hoisted vi.mock factory runs
const sendPasswordResetEmailMock = vi.hoisted(() => vi.fn());
vi.mock('../../services/emailService', () => ({
    emailService: {
        sendPasswordResetEmail: sendPasswordResetEmailMock,
    },
}));

vi.mock('../../config/env', () => ({
    WEB_APP_URL: 'https://kinmeet.ca',
}));

// normalizeEmail passes through lowercase trimmed e-mails
vi.mock('../../utils/email', () => ({
    normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { passwordResetService } from '../../services/passwordResetService';
import { User } from '../../models/User';
import { PasswordResetToken } from '../../models/PasswordResetToken';
import { AppError } from '../../middleware/errorHandler';

// ─── Typed helpers ────────────────────────────────────────────────────────────

const mockUser = vi.mocked(User);
const mockToken = vi.mocked(PasswordResetToken);

const makeSaveableUser = (overrides: Record<string, unknown> = {}) => {
    const user = {
        _id: 'user-id-1',
        email: 'test@example.com',
        firstName: 'Jane',
        password: 'OldPass1',
        save: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
    return user;
};

const makeSaveableRecord = (overrides: Record<string, unknown> = {}) => ({
    userId: 'user-id-1',
    tokenHash: 'some-hash',
    used: false,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('passwordResetService.requestPasswordReset', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockToken.deleteMany.mockResolvedValue({ deletedCount: 0 } as never);
        mockToken.create.mockResolvedValue(undefined as never);
        sendPasswordResetEmailMock.mockResolvedValue(undefined);
    });

    it('throws AppError 404 when no user is found', async () => {
        mockUser.findOne.mockResolvedValue(null);

        await expect(
            passwordResetService.requestPasswordReset('unknown@example.com'),
        ).rejects.toThrow(AppError);

        await expect(
            passwordResetService.requestPasswordReset('unknown@example.com'),
        ).rejects.toMatchObject({ statusCode: 404, message: 'No account found with this email.' });
    });

    it('deletes existing tokens, creates a new one, and sends the email', async () => {
        const user = makeSaveableUser();
        mockUser.findOne.mockResolvedValue(user as never);

        await passwordResetService.requestPasswordReset('test@example.com');

        expect(mockToken.deleteMany).toHaveBeenCalledWith({ userId: user._id });
        expect(mockToken.create).toHaveBeenCalledTimes(1);

        const createArg = mockToken.create.mock.calls[0]![0] as {
            userId: string;
            tokenHash: string;
            expiresAt: Date;
            used: boolean;
        };
        expect(createArg.userId).toBe(user._id);
        expect(typeof createArg.tokenHash).toBe('string');
        expect(createArg.used).toBe(false);
        expect(createArg.expiresAt.getTime()).toBeGreaterThan(Date.now());

        expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
        expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: user.email,
                firstName: user.firstName,
                resetLink: expect.stringContaining('/reset-password?token='),
            }),
        );
    });

    it('stores a SHA-256 hash of the raw token (never the raw token itself)', async () => {
        const user = makeSaveableUser();
        mockUser.findOne.mockResolvedValue(user as never);

        let capturedRawToken = '';
        sendPasswordResetEmailMock.mockImplementationOnce(
            ({ resetLink }: { resetLink: string }) => {
                capturedRawToken = new URL(resetLink).searchParams.get('token') ?? '';
            },
        );

        await passwordResetService.requestPasswordReset('test@example.com');

        const createArg = mockToken.create.mock.calls[0]![0] as { tokenHash: string };
        const expectedHash = crypto
            .createHash('sha256')
            .update(capturedRawToken)
            .digest('hex');

        expect(createArg.tokenHash).toBe(expectedHash);
        expect(createArg.tokenHash).not.toBe(capturedRawToken);
    });

    it('sets an expiry roughly 1 hour in the future', async () => {
        mockUser.findOne.mockResolvedValue(makeSaveableUser() as never);

        await passwordResetService.requestPasswordReset('test@example.com');

        const { expiresAt } = mockToken.create.mock.calls[0]![0] as { expiresAt: Date };
        const diffMs = expiresAt.getTime() - Date.now();

        expect(diffMs).toBeGreaterThan(59 * 60 * 1000);
        expect(diffMs).toBeLessThan(61 * 60 * 1000);
    });
});

describe('passwordResetService.resetPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws AppError 400 for a weak password', async () => {
        await expect(
            passwordResetService.resetPassword('valid-token', 'weakpass'),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws AppError 400 when the token is not found or expired', async () => {
        mockToken.findOne.mockResolvedValue(null);

        await expect(
            passwordResetService.resetPassword('bad-token', 'ValidPass1'),
        ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('expired') });
    });

    it('updates the user password and marks the token used', async () => {
        const record = makeSaveableRecord();
        const user = makeSaveableUser();

        mockToken.findOne.mockResolvedValue(record as never);
        mockUser.findById.mockResolvedValue(user as never);

        await passwordResetService.resetPassword('raw-token-value', 'NewValidPass1');

        expect(user.password).toBe('NewValidPass1');
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(record.used).toBe(true);
        expect(record.save).toHaveBeenCalledTimes(1);
    });

    it('queries the token store with the SHA-256 hash of the raw token', async () => {
        mockToken.findOne.mockResolvedValue(null);

        const rawToken = 'my-raw-token';
        await expect(
            passwordResetService.resetPassword(rawToken, 'ValidPass1'),
        ).rejects.toMatchObject({ statusCode: 400 });

        const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        expect(mockToken.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ tokenHash: expectedHash }),
        );
    });

    it('throws AppError 404 when the user record is missing (orphaned token)', async () => {
        mockToken.findOne.mockResolvedValue(makeSaveableRecord() as never);
        mockUser.findById.mockResolvedValue(null);

        await expect(
            passwordResetService.resetPassword('any-token', 'ValidPass1'),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});
