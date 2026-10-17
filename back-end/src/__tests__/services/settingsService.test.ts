import { describe, it, expect } from 'vitest';
import { settingsService } from '../../services/settingsService';
import { createTestUser } from '../helpers';
import { User } from '../../models/User';

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

        it("accepts the user's own username, in any case, without changing anything", async () => {
            const user = await createTestUser({
                email: 'u4@example.com',
                username: 'sameuser',
            } as any);

            await expect(settingsService.changeUsername(user._id.toString(), 'sameuser'))
                .resolves.toEqual({ username: 'sameuser' });
            await expect(settingsService.changeUsername(user._id.toString(), 'SameUser'))
                .resolves.toEqual({ username: 'sameuser' });
        });

        it('treats usernames as case-insensitive when checking whether one is taken', async () => {
            await createTestUser({ email: 'owner@example.com', username: 'albert' } as any);
            const user = await createTestUser({ email: 'other@example.com' });

            await expect(settingsService.changeUsername(user._id.toString(), 'Albert'))
                .rejects.toMatchObject({ statusCode: 409, message: 'This username is already taken.' });
        });

        it('explains which username rule was broken', async () => {
            const user = await createTestUser({ email: 'rules@example.com' });

            await expect(settingsService.changeUsername(user._id.toString(), 'ab'))
                .rejects.toMatchObject({ statusCode: 400, message: 'Username must be at least 3 characters.' });
            await expect(settingsService.changeUsername(user._id.toString(), 'al-bert'))
                .rejects.toMatchObject({ statusCode: 400, message: 'Username can only contain letters, numbers, and underscores.' });
        });

        it('lets only one of two users claim the same username at the same time', async () => {
            await User.init();
            const first = await createTestUser({ email: 'first@example.com' });
            const second = await createTestUser({ email: 'second@example.com' });

            const results = await Promise.allSettled([
                settingsService.changeUsername(first._id.toString(), 'contested'),
                settingsService.changeUsername(second._id.toString(), 'contested'),
            ]);

            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
            expect(rejected?.reason).toMatchObject({ statusCode: 409, message: 'This username is already taken.' });
            expect(await User.countDocuments({ username: 'contested' })).toBe(1);
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
});
