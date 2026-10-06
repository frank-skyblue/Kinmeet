import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { User } from '../../models/User';

const app = createTestApp();

const signToken = (claims: Record<string, unknown>, secret = process.env.JWT_SECRET!) =>
    jwt.sign(claims, secret, { expiresIn: '1h' });

const getMe = (token: string) =>
    request(app).get('/api/profile/me').set('Authorization', `Bearer ${token}`);

describe('authenticateJWT token versions', () => {
    it('accepts a token whose tv matches the current tokenVersion', async () => {
        const user = await createTestUser();

        const res = await getMe(getAuthToken(user));

        expect(res.status).toBe(200);
    });

    it('accepts a token issued before tokenVersion existed (no tv claim)', async () => {
        const user = await createTestUser();
        const legacyToken = signToken({ id: user._id.toString(), email: user.email, firstName: user.firstName });

        const res = await getMe(legacyToken);

        expect(res.status).toBe(200);
    });

    it('rejects a token once tokenVersion has been incremented', async () => {
        const user = await createTestUser();
        const token = getAuthToken(user);
        await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

        const res = await getMe(token);

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('reports ACCOUNT_DEACTIVATED for a revoked token when the account is deactivated', async () => {
        const user = await createTestUser();
        const token = getAuthToken(user);
        await User.updateOne(
            { _id: user._id },
            { $set: { accountStatus: 'deactivated' }, $inc: { tokenVersion: 1 } },
        );

        const res = await getMe(token);

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('rejects a token for an account that no longer exists', async () => {
        const user = await createTestUser();
        const token = getAuthToken(user);
        await User.deleteOne({ _id: user._id });

        const res = await getMe(token);

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token signed with the wrong secret', async () => {
        const user = await createTestUser();
        const forged = signToken({ id: user._id.toString(), tv: 0 }, 'not-the-secret');

        const res = await getMe(forged);

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 without INVALID_TOKEN when no token is sent', async () => {
        const res = await request(app).get('/api/profile/me');

        expect(res.status).toBe(401);
        expect(res.body.code).toBeUndefined();
    });

    it('does not return INVALID_TOKEN for a wrong current password', async () => {
        const user = await createTestUser({ email: 'wrongpw@test.com', password: 'TestPass123' });

        const res = await request(app)
            .post('/api/settings/account/deactivate')
            .set('Authorization', `Bearer ${getAuthToken(user)}`)
            .send({ currentPassword: 'WrongPass1' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBeUndefined();
    });

    it('never exposes tokenVersion in profile responses', async () => {
        const viewer = await createTestUser({ email: 'viewer@test.com' });
        const target = await createTestUser({ email: 'target@test.com' });

        const own = await getMe(getAuthToken(viewer));
        const other = await request(app)
            .get(`/api/profile/${target._id}`)
            .set('Authorization', `Bearer ${getAuthToken(viewer)}`);

        expect(own.body.user).not.toHaveProperty('tokenVersion');
        expect(other.body.user).not.toHaveProperty('tokenVersion');
    });
});
