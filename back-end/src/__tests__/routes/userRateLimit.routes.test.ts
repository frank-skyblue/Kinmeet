import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeviceSubscription } from '../../models/DeviceSubscription';
import { IUser, User } from '../../models/User';
import { authenticateJWT } from '../../middleware/authMiddleware';
import { errorHandler } from '../../middleware/errorHandler';
import {
    createUserRateLimiter,
    setUserRateLimiterForTests,
    type UserRateLimiter,
} from '../../middleware/rateLimitMiddleware';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';

const app = createTestApp();
const tooManyRequests = {
    success: false,
    message: 'Too many requests. Please try again later.',
};

let nowMs = 0;
let limiter: UserRateLimiter;

const installLimiter = (
    overrides: { capacity?: number; refillPerSecond?: number } = {},
): UserRateLimiter => {
    limiter = createUserRateLimiter({
        capacity: overrides.capacity ?? 2,
        refillPerSecond: overrides.refillPerSecond ?? 1,
        now: () => nowMs,
        reclaimIntervalMs: Number.POSITIVE_INFINITY,
    });
    setUserRateLimiterForTests(limiter);
    return limiter;
};

const signToken = (
    id: string,
    email: string,
    firstName: string,
    options: jwt.SignOptions = { expiresIn: '1h' },
): string =>
    jwt.sign({ id, email, firstName }, process.env.JWT_SECRET!, options);

const expiredAuthToken = (user: IUser): string =>
    jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            exp: Math.floor(Date.now() / 1000) - 30,
        },
        process.env.JWT_SECRET!,
    );

const getProfile = (token?: string) => {
    const profileRequest = request(app).get('/api/profile/me');
    if (token) {
        profileRequest.set('Authorization', `Bearer ${token}`);
    }
    return profileRequest;
};

const pushDevice = (deviceToken: string) => ({
    channel: 'web_push',
    token: deviceToken,
});

const deletePushDevice = (authToken: string | undefined, path: string, deviceToken: string) => {
    const deleteRequest = request(app).delete(path).send(pushDevice(deviceToken));
    if (authToken) {
        deleteRequest.set('Authorization', `Bearer ${authToken}`);
    }
    return deleteRequest;
};

describe('authenticated user rate limit', () => {
    beforeEach(() => {
        nowMs = 0;
        installLimiter();
        expect(limiter.bucketCount()).toBe(0);
    });

    afterEach(() => {
        setUserRateLimiterForTests(null);
    });

    it('rejects the request after capacity and does not change the account', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({
            email: 'rate-limit-email@example.com',
            password: 'TestPass123',
        });
        const token = getAuthToken(user);

        const updated = await request(app)
            .patch('/api/settings/email')
            .set('Authorization', `Bearer ${token}`)
            .send({ newEmail: 'rate-limit-email-new@example.com', currentPassword: 'TestPass123' });
        expect(updated.status).toBe(200);

        const blocked = await request(app)
            .patch('/api/settings/email')
            .set('Authorization', `Bearer ${token}`)
            .send({ newEmail: 'rate-limit-email-other@example.com', currentPassword: 'TestPass123' });
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(tooManyRequests);

        const saved = await User.findById(user._id);
        expect(saved?.email).toBe('rate-limit-email-new@example.com');
    });

    it('spends a token on a 400 and blocks the next upload before multer runs', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-photo@example.com' });
        const token = getAuthToken(user);

        const missingFile = await request(app)
            .post('/api/profile/photo')
            .set('Authorization', `Bearer ${token}`)
            .field('note', 'no-photo');
        expect(missingFile.status).toBe(400);
        expect(missingFile.body.message).toBe('No image file provided');

        const blocked = await request(app)
            .post('/api/profile/photo')
            .set('Authorization', `Bearer ${token}`);
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(tooManyRequests);
    });

    it('shares one bucket across tokens and protected routes', async () => {
        const user = await createTestUser({ email: 'rate-limit-shared@example.com' });
        const userId = user._id.toString();
        const firstToken = signToken(userId, user.email, user.firstName, { expiresIn: '1h', jwtid: 'a' });
        const secondToken = signToken(userId, user.email, user.firstName, { expiresIn: '1h', jwtid: 'b' });
        expect(firstToken).not.toBe(secondToken);

        const profile = await request(app)
            .get('/api/profile/me')
            .set('Authorization', `Bearer ${firstToken}`);
        expect(profile.status).toBe(200);

        const connections = await request(app)
            .get('/api/connections')
            .set('Authorization', `Bearer ${secondToken}`);
        expect(connections.status).toBe(200);

        const conversations = await request(app)
            .get('/api/chat/conversations')
            .set('Authorization', `Bearer ${firstToken}`);
        expect(conversations.status).toBe(429);
        expect(conversations.body).toEqual(tooManyRequests);
    });

    it('does not consume another user quota', async () => {
        installLimiter({ capacity: 1 });
        const firstUser = await createTestUser({ email: 'rate-limit-user-a@example.com' });
        const secondUser = await createTestUser({ email: 'rate-limit-user-b@example.com' });
        const firstToken = getAuthToken(firstUser);
        const secondToken = getAuthToken(secondUser);

        const firstAllowed = await getProfile(firstToken);
        expect(firstAllowed.status).toBe(200);

        const firstBlocked = await getProfile(firstToken);
        expect(firstBlocked.status).toBe(429);

        const secondAllowed = await getProfile(secondToken);
        expect(secondAllowed.status).toBe(200);
    });

    it('leaves the full quota available after rejected credentials', async () => {
        installLimiter({ capacity: 2 });
        const user = await createTestUser({ email: 'rate-limit-rejected@example.com' });
        const token = getAuthToken(user);
        const expired = expiredAuthToken(user);
        const emptyId = signToken('', 'empty-id@example.com', 'Empty');

        const missing = await getProfile();
        expect(missing.status).toBe(401);

        const invalid = await getProfile('not-a-token');
        expect(invalid.status).toBe(401);

        const expiredResponse = await getProfile(expired);
        expect(expiredResponse.status).toBe(401);

        const emptyUserId = await getProfile(emptyId);
        expect(emptyUserId.status).toBe(401);
        expect(limiter.bucketCount()).toBe(0);

        const firstAllowed = await getProfile(token);
        expect(firstAllowed.status).toBe(200);

        const secondAllowed = await getProfile(token);
        expect(secondAllowed.status).toBe(200);

        const blocked = await getProfile(token);
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(tooManyRequests);
    });

    it('returns 401 for an expired token after the quota is spent and does not change the refill', async () => {
        installLimiter({ capacity: 2 });
        const user = await createTestUser({ email: 'rate-limit-expired@example.com' });
        const token = getAuthToken(user);
        const expired = expiredAuthToken(user);

        const firstAllowed = await getProfile(token);
        expect(firstAllowed.status).toBe(200);

        const secondAllowed = await getProfile(token);
        expect(secondAllowed.status).toBe(200);

        const expiredResponse = await getProfile(expired);
        expect(expiredResponse.status).toBe(401);
        expect(expiredResponse.body.message).toBe('Invalid token');

        nowMs = 1000;
        const refilled = await getProfile(token);
        expect(refilled.status).toBe(200);

        const blocked = await getProfile(token);
        expect(blocked.status).toBe(429);
        expect(blocked.headers['retry-after']).toBe('1');
    });

    it('returns the calculated Retry-After header', async () => {
        installLimiter({ capacity: 1, refillPerSecond: 0.25 });
        const user = await createTestUser({ email: 'rate-limit-retry@example.com' });
        const token = getAuthToken(user);

        const allowed = await getProfile(token);
        expect(allowed.status).toBe(200);

        const blocked = await getProfile(token);
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(tooManyRequests);
        expect(blocked.headers['retry-after']).toBe('4');
    });

    it('allows only the capacity when protected requests arrive together', async () => {
        installLimiter({ capacity: 5 });
        const user = await createTestUser({ email: 'rate-limit-concurrent@example.com' });
        const token = getAuthToken(user);

        const results = await Promise.all(
            Array.from({ length: 12 }, () =>
                request(app).get('/api/profile/me').set('Authorization', `Bearer ${token}`),
            ),
        );

        expect(results.filter((result) => result.status === 200)).toHaveLength(5);
        expect(results.filter((result) => result.status === 429)).toHaveLength(7);
    });

    it('still answers public login with the existing status after the user quota is spent', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({
            email: 'rate-limit-login@example.com',
            password: 'TestPass123',
        });
        const token = getAuthToken(user);

        const allowed = await getProfile(token);
        expect(allowed.status).toBe(200);

        const blocked = await getProfile(token);
        expect(blocked.status).toBe(429);

        const loggedIn = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rate-limit-login@example.com', password: 'TestPass123' });
        expect(loggedIn.status).toBe(200);
        expect(loggedIn.body.success).toBe(true);

        const rejected = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rate-limit-login@example.com', password: 'Wrong1234' });
        expect(rejected.status).toBe(401);
        expect(rejected.body.message).not.toBe(tooManyRequests.message);

        const stillBlocked = await getProfile(token);
        expect(stillBlocked.status).toBe(429);
    });

    it('reports a downstream error as 500 after the token was spent', async () => {
        installLimiter({ capacity: 1 });
        const downstream = express();
        downstream.get('/boom', authenticateJWT, () => {
            throw new Error('downstream');
        });
        downstream.use(errorHandler);
        const token = signToken('downstream-user', 'downstream@example.com', 'Down');

        const failed = await request(downstream).get('/boom').set('Authorization', `Bearer ${token}`);
        expect(failed.status).toBe(500);
        expect(failed.body.message).not.toBe('Invalid token');

        const blocked = await request(downstream).get('/boom').set('Authorization', `Bearer ${token}`);
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(tooManyRequests);
    });

    it('uses the shared limiter again after the test limiter is restored', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-restore@example.com' });
        const token = getAuthToken(user);

        const allowed = await getProfile(token);
        expect(allowed.status).toBe(200);

        const blocked = await getProfile(token);
        expect(blocked.status).toBe(429);

        setUserRateLimiterForTests(null);
        const restored = await getProfile(token);
        expect(restored.status).toBe(200);
    });

    it('removes a push subscription after the quota is spent and still logs out', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-unregister@example.com' });
        const authToken = getAuthToken(user);
        const deviceToken = 'push-token-unregister';
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: deviceToken,
        });

        const allowed = await getProfile(authToken);
        expect(allowed.status).toBe(200);

        const blocked = await getProfile(authToken);
        expect(blocked.status).toBe(429);

        const removed = await deletePushDevice(authToken, '/api/notifications/devices', deviceToken);
        expect(removed.status).toBe(200);

        const remaining = await DeviceSubscription.countDocuments({ userId: user._id, token: deviceToken });
        expect(remaining).toBe(0);

        const loggedOut = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${authToken}`);
        expect(loggedOut.status).toBe(200);
        expect(loggedOut.body.success).toBe(true);

        const stillBlocked = await getProfile(authToken);
        expect(stillBlocked.status).toBe(429);
    });

    it('does not spend a business token when a push device is removed', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-unregister-free@example.com' });
        const authToken = getAuthToken(user);
        const deviceToken = 'push-token-free';
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: deviceToken,
        });

        const removed = await deletePushDevice(authToken, '/api/notifications/devices', deviceToken);
        expect(removed.status).toBe(200);

        const allowed = await getProfile(authToken);
        expect(allowed.status).toBe(200);
    });

    it('still spends a token when registering a push device', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-register@example.com' });
        const authToken = getAuthToken(user);

        const registered = await request(app)
            .post('/api/notifications/devices')
            .set('Authorization', `Bearer ${authToken}`)
            .send(pushDevice('push-token-register'));
        expect(registered.status).toBe(200);

        const blocked = await getProfile(authToken);
        expect(blocked.status).toBe(429);

        const saved = await DeviceSubscription.countDocuments({ userId: user._id, token: 'push-token-register' });
        expect(saved).toBe(1);
    });

    it('still blocks device registration and other deletes after the quota is spent', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-register-blocked@example.com' });
        const authToken = getAuthToken(user);

        const allowed = await getProfile(authToken);
        expect(allowed.status).toBe(200);

        const registered = await request(app)
            .post('/api/notifications/devices')
            .set('Authorization', `Bearer ${authToken}`)
            .send(pushDevice('push-token-blocked'));
        expect(registered.status).toBe(429);

        const saved = await DeviceSubscription.countDocuments({ userId: user._id });
        expect(saved).toBe(0);

        const deletedPhoto = await request(app)
            .delete('/api/profile/photo')
            .set('Authorization', `Bearer ${authToken}`);
        expect(deletedPhoto.status).toBe(429);
    });

    it('keeps the subscription when device removal has no valid token', async () => {
        const user = await createTestUser({ email: 'rate-limit-unregister-auth@example.com' });
        const deviceToken = 'push-token-protected';
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: deviceToken,
        });

        const missing = await deletePushDevice(undefined, '/api/notifications/devices', deviceToken);
        expect(missing.status).toBe(401);

        const invalid = await deletePushDevice('not-a-token', '/api/notifications/devices', deviceToken);
        expect(invalid.status).toBe(401);

        const expired = await deletePushDevice(expiredAuthToken(user), '/api/notifications/devices', deviceToken);
        expect(expired.status).toBe(401);

        const remaining = await DeviceSubscription.countDocuments({ userId: user._id, token: deviceToken });
        expect(remaining).toBe(1);
    });

    it('still removes the device when the unregister URL has a query or trailing slash', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-unregister-url@example.com' });
        const authToken = getAuthToken(user);
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: 'push-token-query',
        });
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: 'push-token-slash',
        });

        const allowed = await getProfile(authToken);
        expect(allowed.status).toBe(200);

        const withQuery = await deletePushDevice(
            authToken,
            '/api/notifications/devices?client=web',
            'push-token-query',
        );
        expect(withQuery.status).toBe(200);

        const withSlash = await deletePushDevice(
            authToken,
            '/api/notifications/devices/',
            'push-token-slash',
        );
        expect(withSlash.status).toBe(200);

        const remaining = await DeviceSubscription.countDocuments({ userId: user._id });
        expect(remaining).toBe(0);

        const stillBlocked = await getProfile(authToken);
        expect(stillBlocked.status).toBe(429);
    });

    it('does not exempt a nearby notifications path from the token bucket', async () => {
        installLimiter({ capacity: 1 });
        const user = await createTestUser({ email: 'rate-limit-nearby-path@example.com' });
        const authToken = getAuthToken(user);
        await DeviceSubscription.create({
            userId: user._id,
            channel: 'web_push',
            token: 'push-token-nearby',
        });

        const nearby = await deletePushDevice(
            authToken,
            '/api/notifications/devices/extra',
            'push-token-nearby',
        );
        expect(nearby.status).not.toBe(200);

        const blocked = await getProfile(authToken);
        expect(blocked.status).toBe(429);

        const remaining = await DeviceSubscription.countDocuments({
            userId: user._id,
            token: 'push-token-nearby',
        });
        expect(remaining).toBe(1);
    });
});
