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
    getLoginLockoutConfig: () => ({
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        durationMs: 15 * 60 * 1000,
    }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { passwordResetService } from '../../services/passwordResetService';
import { loginLockoutService } from '../../services/loginLockoutService';
import { User } from '../../models/User';
import { PasswordResetToken } from '../../models/PasswordResetToken';
import { LoginLockout } from '../../models/LoginLockout';

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

    it('resolves without creating a token when no user is found', async () => {
        mockUser.findOne.mockResolvedValue(null);

        await expect(
            passwordResetService.requestPasswordReset('unknown@example.com'),
        ).resolves.toBeUndefined();

        expect(mockToken.deleteMany).not.toHaveBeenCalled();
        expect(mockToken.create).not.toHaveBeenCalled();
        expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    });

    it('lets a failed user lookup surface as a system error', async () => {
        mockUser.findOne.mockRejectedValue(new Error('db down'));

        await expect(
            passwordResetService.requestPasswordReset('test@example.com'),
        ).rejects.toThrow('db down');
        expect(mockToken.create).not.toHaveBeenCalled();
    });

    it('resolves when storing the token fails and does not log the email or token', async () => {
        mockUser.findOne.mockResolvedValue(makeSaveableUser() as never);
        mockToken.create.mockRejectedValueOnce(new Error('duplicate for test@example.com token=secret-token'));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await expect(
            passwordResetService.requestPasswordReset('test@example.com'),
        ).resolves.toBeUndefined();

        const logged = errorSpy.mock.calls.flat().join(' ');
        expect(logged).toContain('store_token');
        expect(logged).not.toContain('test@example.com');
        expect(logged).not.toContain('secret-token');
        expect(logged).not.toContain('duplicate for');
        errorSpy.mockRestore();
    });

    it('resolves when sending the email fails and does not log the provider body', async () => {
        mockUser.findOne.mockResolvedValue(makeSaveableUser() as never);
        sendPasswordResetEmailMock.mockRejectedValueOnce(
            new Error('Resend rejected user@example.com token=raw-token'),
        );
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await expect(
            passwordResetService.requestPasswordReset('test@example.com'),
        ).resolves.toBeUndefined();

        const logged = errorSpy.mock.calls.flat().join(' ');
        expect(logged).toContain('send_email');
        expect(logged).not.toContain('user@example.com');
        expect(logged).not.toContain('raw-token');
        expect(logged).not.toContain('Resend rejected');
        errorSpy.mockRestore();
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

    it('does not release the lock or mark the token when saving the password fails, then retry completes', async () => {
        const record = makeSaveableRecord();
        const user = makeSaveableUser();
        mockToken.findOne.mockResolvedValue(record as never);
        mockUser.findById.mockResolvedValue(user as never);
        user.save.mockRejectedValueOnce(new Error('password save failed'));
        const release = vi.spyOn(loginLockoutService, 'releaseForPasswordReset');

        await expect(
            passwordResetService.resetPassword('raw-token', 'NewValidPass1'),
        ).rejects.toThrow('password save failed');
        expect(release).not.toHaveBeenCalled();
        expect(record.save).not.toHaveBeenCalled();
        expect(record.used).toBe(false);

        user.save.mockResolvedValueOnce(undefined);
        release.mockResolvedValueOnce(false);
        await passwordResetService.resetPassword('raw-token', 'NewValidPass1');
        expect(record.used).toBe(true);
        expect(record.save).toHaveBeenCalledTimes(1);
        release.mockRestore();
    });

    it('does not mark the token when clearing the lock fails, then retry completes', async () => {
        const record = makeSaveableRecord();
        const user = makeSaveableUser();
        mockToken.findOne.mockResolvedValue(record as never);
        mockUser.findById.mockResolvedValue(user as never);
        const release = vi.spyOn(loginLockoutService, 'releaseForPasswordReset')
            .mockRejectedValueOnce(new Error('lockout delete failed'));

        await expect(
            passwordResetService.resetPassword('raw-token', 'NewValidPass1'),
        ).rejects.toThrow('lockout delete failed');
        // The mock rejected before a delete command. This asserts call order, not a database commit.
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(record.save).not.toHaveBeenCalled();
        expect(record.used).toBe(false);

        release.mockResolvedValueOnce(false);
        await passwordResetService.resetPassword('raw-token', 'NewValidPass1');
        expect(release).toHaveBeenCalledTimes(2);
        expect(record.used).toBe(true);
        release.mockRestore();
    });

    it('keeps the new password and cleared lock when marking the token fails, then retry marks it', async () => {
        const record = makeSaveableRecord();
        const user = makeSaveableUser();
        mockToken.findOne.mockResolvedValue(record as never);
        mockUser.findById.mockResolvedValue(user as never);
        record.save.mockRejectedValueOnce(new Error('token save failed'));
        const release = vi.spyOn(loginLockoutService, 'releaseForPasswordReset').mockResolvedValue(false);

        await expect(
            passwordResetService.resetPassword('raw-token', 'NewValidPass1'),
        ).rejects.toThrow('token save failed');
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(release).toHaveBeenCalledTimes(1);
        expect(record.save).toHaveBeenCalledTimes(1);
        // The rejected save did not commit the used flag. The in-memory assignment is not that commit.
        record.used = false;

        await passwordResetService.resetPassword('raw-token', 'NewValidPass1');
        expect(record.used).toBe(true);
        expect(record.save).toHaveBeenCalledTimes(2);
        release.mockRestore();
    });

    it('removes an active lock and still completes when the security log throws', async () => {
        const record = makeSaveableRecord();
        const user = makeSaveableUser();
        mockToken.findOne.mockResolvedValue(record as never);
        mockUser.findById.mockResolvedValue(user as never);
        await LoginLockout.create({
            email: 'test@example.com',
            failedAt: [new Date('2026-01-01T00:00:00.000Z')],
            lockedUntil: new Date(Date.now() + 60_000),
            justLocked: true,
            expiresAt: new Date(Date.now() + 60_000),
        });
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
            throw new Error('log down');
        });

        await passwordResetService.resetPassword('raw-token', 'NewValidPass1');

        expect(await LoginLockout.findOne({ email: 'test@example.com' })).toBeNull();
        expect(record.used).toBe(true);
        infoSpy.mockRestore();
    });
});
