import { describe, it, expect } from 'vitest';
import { settingsService } from '../../services/settingsService';
import { createTestUser } from '../helpers';
import { User } from '../../models/User';
import { AccountEvent } from '../../models/AccountEvent';

describe('settingsService', () => {
    describe('changeEmail', () => {
        it('updates the email when credentials are correct', async () => {
            const user = await createTestUser({ email: 'old@example.com', password: 'TestPass123' });

            const result = await settingsService.changeEmail(
                user._id.toString(),
                'new@example.com',
                'TestPass123',
            );

            expect(result.email).toBe('new@example.com');
        });

        it('throws 401 when current password is wrong', async () => {
            const user = await createTestUser({ email: 'user1@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changeEmail(user._id.toString(), 'new@example.com', 'WrongPass1'),
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it('throws 409 when new email is already taken', async () => {
            const user1 = await createTestUser({ email: 'taken@example.com', password: 'TestPass123' });
            const user2 = await createTestUser({ email: 'changer@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changeEmail(user2._id.toString(), user1.email, 'TestPass123'),
            ).rejects.toMatchObject({ statusCode: 409 });
        });

        it('throws 400 when new email is the same as current', async () => {
            const user = await createTestUser({ email: 'same@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changeEmail(user._id.toString(), 'same@example.com', 'TestPass123'),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 404 for nonexistent user', async () => {
            await expect(
                settingsService.changeEmail('507f1f77bcf86cd799439011', 'x@example.com', 'pass'),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('changeUsername', () => {
        it('updates the username to a valid new value', async () => {
            const user = await createTestUser({
                email: 'usrchange@example.com',
                password: 'TestPass123',
                username: 'oldname',
            } as any);

            const result = await settingsService.changeUsername(user._id.toString(), 'newname_1');

            expect(result.username).toBe('newname_1');
        });

        it('throws 409 when username is already taken', async () => {
            const user1 = await createTestUser({
                email: 'u1@example.com',
                username: 'takenname',
            } as any);
            const user2 = await createTestUser({ email: 'u2@example.com' });

            await expect(
                settingsService.changeUsername(user2._id.toString(), user1.username!),
            ).rejects.toMatchObject({ statusCode: 409 });
        });

        it('throws 400 for invalid username format', async () => {
            const user = await createTestUser({ email: 'u3@example.com' });

            await expect(
                settingsService.changeUsername(user._id.toString(), 'invalid name!'),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when new username equals current username', async () => {
            const user = await createTestUser({
                email: 'u4@example.com',
                username: 'sameuser',
            } as any);

            await expect(
                settingsService.changeUsername(user._id.toString(), 'sameuser'),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 404 for nonexistent user', async () => {
            await expect(
                settingsService.changeUsername('507f1f77bcf86cd799439011', 'newname'),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('changePassword', () => {
        it('updates the password when current password is correct', async () => {
            const user = await createTestUser({ email: 'pwchange@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changePassword(user._id.toString(), 'TestPass123', 'NewPass456'),
            ).resolves.toBeUndefined();
        });

        it('throws 401 when current password is wrong', async () => {
            const user = await createTestUser({ email: 'pwwrong@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changePassword(user._id.toString(), 'WrongPass1', 'NewPass456'),
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it('throws 400 when new password is the same as current', async () => {
            const user = await createTestUser({ email: 'pwsame@example.com', password: 'TestPass123' });

            await expect(
                settingsService.changePassword(user._id.toString(), 'TestPass123', 'TestPass123'),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 404 for nonexistent user', async () => {
            await expect(
                settingsService.changePassword('507f1f77bcf86cd799439011', 'old', 'NewPass456'),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deactivateAccount', () => {
        it('marks the account deactivated, stamps the date and records one event', async () => {
            const user = await createTestUser({ email: 'deact@example.com', password: 'TestPass123' });

            await settingsService.deactivateAccount(user._id.toString(), 'TestPass123');

            const updated = await User.findById(user._id);
            expect(updated?.accountStatus).toBe('deactivated');
            expect(updated?.deactivatedAt).toBeInstanceOf(Date);
            const events = await AccountEvent.find({ user: user._id });
            expect(events.map((e) => e.type)).toEqual(['deactivated']);
        });

        it('throws 401 and leaves the account active when the password is wrong', async () => {
            const user = await createTestUser({ email: 'deact-wrong@example.com', password: 'TestPass123' });

            await expect(
                settingsService.deactivateAccount(user._id.toString(), 'WrongPass1'),
            ).rejects.toMatchObject({ statusCode: 401 });

            const unchanged = await User.findById(user._id);
            expect(unchanged?.accountStatus).toBe('active');
            expect(await AccountEvent.countDocuments({ user: user._id })).toBe(0);
        });

        it('is a no-op when repeated, keeping the original date and a single event', async () => {
            const user = await createTestUser({ email: 'deact-twice@example.com', password: 'TestPass123' });
            await settingsService.deactivateAccount(user._id.toString(), 'TestPass123');
            const firstDate = (await User.findById(user._id))?.deactivatedAt;

            await settingsService.deactivateAccount(user._id.toString(), 'TestPass123');

            const updated = await User.findById(user._id);
            expect(updated?.deactivatedAt?.getTime()).toBe(firstDate?.getTime());
            expect(await AccountEvent.countDocuments({ user: user._id })).toBe(1);
        });

        it('does not store the password in the audit event', async () => {
            const user = await createTestUser({ email: 'deact-audit@example.com', password: 'TestPass123' });

            await settingsService.deactivateAccount(user._id.toString(), 'TestPass123');

            const event = await AccountEvent.findOne({ user: user._id }).lean();
            expect(JSON.stringify(event)).not.toContain('TestPass123');
        });

        it('throws 404 for nonexistent user', async () => {
            await expect(
                settingsService.deactivateAccount('507f1f77bcf86cd799439011', 'TestPass123'),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('reactivateAccount', () => {
        it('restores the account, clears the date and records an event', async () => {
            const user = await createTestUser({ email: 'react@example.com', password: 'TestPass123' });
            await settingsService.deactivateAccount(user._id.toString(), 'TestPass123');

            const result = await settingsService.reactivateAccount(user._id.toString());

            expect(result.accountStatus).toBe('active');
            const updated = await User.findById(user._id);
            expect(updated?.accountStatus).toBe('active');
            expect(updated?.deactivatedAt).toBeUndefined();
            const events = await AccountEvent.find({ user: user._id }).sort({ createdAt: 1 });
            expect(events.map((e) => e.type)).toEqual(['deactivated', 'reactivated']);
        });

        it('is a no-op for an account that is already active', async () => {
            const user = await createTestUser({ email: 'react-active@example.com' });

            const result = await settingsService.reactivateAccount(user._id.toString());

            expect(result.accountStatus).toBe('active');
            expect(await AccountEvent.countDocuments({ user: user._id })).toBe(0);
        });

        it('throws 404 for nonexistent user', async () => {
            await expect(
                settingsService.reactivateAccount('507f1f77bcf86cd799439011'),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
