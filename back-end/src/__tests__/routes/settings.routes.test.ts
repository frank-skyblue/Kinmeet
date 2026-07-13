import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';

const app = createTestApp();

describe('Settings Routes', () => {
    describe('PATCH /api/settings/email', () => {
        it('returns 401 without a token', async () => {
            const res = await request(app).patch('/api/settings/email').send({
                newEmail: 'x@example.com',
                currentPassword: 'TestPass123',
            });
            expect(res.status).toBe(401);
        });

        it('returns 200 and updated email with valid credentials', async () => {
            const user = await createTestUser({ email: 'email-route@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/email')
                .set('Authorization', `Bearer ${token}`)
                .send({ newEmail: 'updated-email@example.com', currentPassword: 'TestPass123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.email).toBe('updated-email@example.com');
        });

        it('returns 400 for invalid email in body', async () => {
            const user = await createTestUser({ email: 'email-valid@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/email')
                .set('Authorization', `Bearer ${token}`)
                .send({ newEmail: 'not-an-email', currentPassword: 'TestPass123' });

            expect(res.status).toBe(400);
        });

        it('returns 401 for wrong current password', async () => {
            const user = await createTestUser({ email: 'email-wrongpw@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/email')
                .set('Authorization', `Bearer ${token}`)
                .send({ newEmail: 'newaddr@example.com', currentPassword: 'WrongPass1' });

            expect(res.status).toBe(401);
        });

        it('returns 409 when new email is already in use', async () => {
            await createTestUser({ email: 'occupied@example.com', password: 'TestPass123' });
            const user2 = await createTestUser({ email: 'changer-route@example.com', password: 'TestPass123' });
            const token = getAuthToken(user2);

            const res = await request(app)
                .patch('/api/settings/email')
                .set('Authorization', `Bearer ${token}`)
                .send({ newEmail: 'occupied@example.com', currentPassword: 'TestPass123' });

            expect(res.status).toBe(409);
        });
    });

    describe('PATCH /api/settings/username', () => {
        it('returns 401 without a token', async () => {
            const res = await request(app).patch('/api/settings/username').send({ newUsername: 'abc' });
            expect(res.status).toBe(401);
        });

        it('returns 200 and updated username', async () => {
            const user = await createTestUser({ email: 'usr-route@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/username')
                .set('Authorization', `Bearer ${token}`)
                .send({ newUsername: 'new_handle_99' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.username).toBe('new_handle_99');
        });

        it('returns 400 for an invalid username', async () => {
            const user = await createTestUser({ email: 'usr-invalid@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/username')
                .set('Authorization', `Bearer ${token}`)
                .send({ newUsername: 'ab' }); // too short

            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/settings/password', () => {
        it('returns 401 without a token', async () => {
            const res = await request(app).patch('/api/settings/password').send({
                currentPassword: 'TestPass123',
                newPassword: 'NewPass456',
            });
            expect(res.status).toBe(401);
        });

        it('returns 200 on successful password change', async () => {
            const user = await createTestUser({ email: 'pw-route@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'TestPass123', newPassword: 'NewPass456' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 401 for wrong current password', async () => {
            const user = await createTestUser({ email: 'pw-wrongcurrent@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass456' });

            expect(res.status).toBe(401);
        });

        it('returns 400 for a weak new password', async () => {
            const user = await createTestUser({ email: 'pw-weak@example.com', password: 'TestPass123' });
            const token = getAuthToken(user);

            const res = await request(app)
                .patch('/api/settings/password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'TestPass123', newPassword: 'weak' });

            expect(res.status).toBe(400);
        });
    });
});
