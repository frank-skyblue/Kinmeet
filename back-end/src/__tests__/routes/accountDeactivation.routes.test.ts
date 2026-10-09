import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Block } from '../../models/Block';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { DeviceSubscription } from '../../models/DeviceSubscription';
import { Message } from '../../models/Message';
import { settingsService } from '../../services/settingsService';

const app = createTestApp();

const deactivate = (userId: string) => settingsService.deactivateAccount(userId, 'TestPass123');

const signIn = async (email: string): Promise<string> => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123' });
    return res.body.token;
};

// Alice stays active; Bob is the account that gets deactivated.
const createPair = async () => {
    const alice = await createTestUser({ email: 'alice@test.com', firstName: 'Alice' });
    const bob = await createTestUser({ email: 'bob@test.com', firstName: 'Bob', lastName: 'Brown' });
    return {
        alice,
        bob,
        aliceToken: getAuthToken(alice),
        bobToken: getAuthToken(bob),
        bobId: bob._id.toString(),
    };
};

describe('Account deactivation', () => {
    describe('POST /api/settings/account/deactivate', () => {
        it('returns 401 without a token', async () => {
            const res = await request(app)
                .post('/api/settings/account/deactivate')
                .send({ currentPassword: 'TestPass123' });
            expect(res.status).toBe(401);
        });

        it('returns 400 when the password is missing', async () => {
            const { bobToken } = await createPair();

            const res = await request(app)
                .post('/api/settings/account/deactivate')
                .set('Authorization', `Bearer ${bobToken}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 for a wrong password', async () => {
            const { bobToken } = await createPair();

            const res = await request(app)
                .post('/api/settings/account/deactivate')
                .set('Authorization', `Bearer ${bobToken}`)
                .send({ currentPassword: 'WrongPass1' });

            expect(res.status).toBe(401);
        });

        it('deactivates the account with the correct password', async () => {
            const { bobToken } = await createPair();

            const res = await request(app)
                .post('/api/settings/account/deactivate')
                .set('Authorization', `Bearer ${bobToken}`)
                .send({ currentPassword: 'TestPass123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('signing out every device', () => {
        it('ends sessions from before deactivation on every route, including reactivation', async () => {
            const { bobToken, bobId } = await createPair();
            await deactivate(bobId);

            const requests = [
                request(app).get('/api/profile/me'),
                request(app).get('/api/matching'),
                request(app).post('/api/settings/account/reactivate'),
                request(app).delete('/api/profile/me'),
            ];
            for (const req of requests) {
                const res = await req.set('Authorization', `Bearer ${bobToken}`);
                // 401: the session is over. ACCOUNT_DEACTIVATED tells the client why, so it
                // can offer reactivation after the user signs in again.
                expect(res.status).toBe(401);
                expect(res.body.code).toBe('ACCOUNT_DEACTIVATED');
            }
        });

        it('removes the push subscriptions of every device', async () => {
            const { bob, bobId } = await createPair();
            await DeviceSubscription.create([
                { userId: bob._id, channel: 'web_push', token: 'laptop' },
                { userId: bob._id, channel: 'web_push', token: 'phone' },
            ]);

            await deactivate(bobId);

            expect(await DeviceSubscription.countDocuments({ userId: bob._id })).toBe(0);
        });

        it('leaves other users signed in', async () => {
            const { aliceToken, bobId } = await createPair();
            await deactivate(bobId);

            const res = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${aliceToken}`);

            expect(res.status).toBe(200);
        });
    });

    describe('while deactivated, after signing in again', () => {
        it('reports the deactivated status at sign-in', async () => {
            const { bobId } = await createPair();
            await deactivate(bobId);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'bob@test.com', password: 'TestPass123' });

            expect(res.status).toBe(200);
            expect(res.body.user.accountStatus).toBe('deactivated');
        });

        it('is rejected with ACCOUNT_DEACTIVATED on regular routes', async () => {
            const { bobId } = await createPair();
            await deactivate(bobId);
            const token = await signIn('bob@test.com');

            for (const path of ['/api/profile/me', '/api/matching', '/api/connections', '/api/chat/conversations']) {
                const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);
                expect(res.status, path).toBe(403);
                expect(res.body.code, path).toBe('ACCOUNT_DEACTIVATED');
            }
        });

        it('can sign out and unregister its push device', async () => {
            const { bobId } = await createPair();
            await deactivate(bobId);
            const token = await signIn('bob@test.com');

            const logout = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            const unregister = await request(app)
                .delete('/api/notifications/devices')
                .set('Authorization', `Bearer ${token}`)
                .send({ channel: 'web_push', token: 'device-token' });

            expect(logout.status).toBe(200);
            expect(unregister.status).toBe(200);
        });

        it('can permanently delete itself', async () => {
            const { bobId } = await createPair();
            await deactivate(bobId);
            const token = await signIn('bob@test.com');

            const res = await request(app)
                .delete('/api/profile/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('regains normal access with the same token after reactivating', async () => {
            const { bobId } = await createPair();
            await deactivate(bobId);
            const token = await signIn('bob@test.com');

            const reactivate = await request(app)
                .post('/api/settings/account/reactivate')
                .set('Authorization', `Bearer ${token}`);
            const profile = await request(app)
                .get('/api/profile/me')
                .set('Authorization', `Bearer ${token}`);

            expect(reactivate.status).toBe(200);
            expect(reactivate.body.accountStatus).toBe('active');
            expect(profile.status).toBe(200);
        });
    });

    describe('while deactivated, other users', () => {
        it('do not see the account in Discover', async () => {
            const { aliceToken, bobId } = await createPair();
            await deactivate(bobId);

            const res = await request(app).get('/api/matching').set('Authorization', `Bearer ${aliceToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.matches.map((m: { _id: string }) => m._id);
            expect(ids).not.toContain(bobId);
        });

        it('cannot send it a meet request', async () => {
            const { aliceToken, bobId } = await createPair();
            await deactivate(bobId);

            const res = await request(app)
                .post('/api/matching/meet')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ receiverId: bobId });

            expect(res.status).toBe(404);
        });

        it('do not see its pending request, and cannot accept it', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            const pending = await ConnectionRequest.create({ sender: bob._id, receiver: alice._id, status: 'pending' });
            await deactivate(bobId);

            const list = await request(app)
                .get('/api/connections/requests')
                .set('Authorization', `Bearer ${aliceToken}`);
            const accept = await request(app)
                .post(`/api/connections/requests/${pending._id}/accept`)
                .set('Authorization', `Bearer ${aliceToken}`);

            expect(list.body.requests).toHaveLength(0);
            expect(accept.status).toBe(404);
            expect(await ConnectionRequest.exists({ _id: pending._id, status: 'pending' })).toBeTruthy();
        });

        it('do not see it in My Kins, while the connection is preserved', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            await Connection.create({ user1: alice._id, user2: bob._id });
            await deactivate(bobId);

            const res = await request(app).get('/api/connections').set('Authorization', `Bearer ${aliceToken}`);

            expect(res.body.connections).toHaveLength(0);
            expect(await Connection.countDocuments()).toBe(1);
        });

        it('cannot open its profile, and get the same 404 as for a missing account', async () => {
            const { aliceToken, bobId } = await createPair();
            await deactivate(bobId);

            const res = await request(app)
                .get(`/api/profile/${bobId}`)
                .set('Authorization', `Bearer ${aliceToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });

        it('cannot send it new messages', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            await Connection.create({ user1: alice._id, user2: bob._id });
            await deactivate(bobId);

            const res = await request(app)
                .post('/api/chat/messages')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ receiverId: bobId, content: 'Are you there?' });

            expect(res.status).toBe(403);
            expect(await Message.countDocuments()).toBe(0);
        });

        it('keep the conversation history, with the account shown as Unavailable', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            await Connection.create({ user1: alice._id, user2: bob._id });
            await Message.create({ sender: bob._id, receiver: alice._id, content: 'Hi Alice' });
            await deactivate(bobId);

            const inbox = await request(app)
                .get('/api/chat/conversations')
                .set('Authorization', `Bearer ${aliceToken}`);
            const thread = await request(app)
                .get(`/api/chat/conversations/${bobId}`)
                .set('Authorization', `Bearer ${aliceToken}`);

            const [row] = inbox.body.conversations;
            expect(row.user).toEqual({ _id: bobId, firstName: 'Unavailable', lastName: '', unavailable: true });
            expect(row.lastMessage.content).toBe('Hi Alice');
            expect(row.lastMessage.sender.firstName).toBe('Unavailable');

            expect(thread.status).toBe(200);
            expect(thread.body.messages).toHaveLength(1);
            expect(thread.body.messages[0].content).toBe('Hi Alice');
            expect(thread.body.messages[0].sender).toEqual({ _id: bobId, firstName: 'Unavailable', lastName: '' });
            expect(JSON.stringify(thread.body)).not.toContain('Brown');
        });
    });

    describe('after reactivation', () => {
        it('restores visibility and messaging, and keeps blocks in place', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            const carol = await createTestUser({ email: 'carol@test.com', firstName: 'Carol' });
            await Connection.create({ user1: alice._id, user2: bob._id });
            await Block.create({ blocker: carol._id, blocked: bob._id });
            await deactivate(bobId);

            await request(app)
                .post('/api/settings/account/reactivate')
                .set('Authorization', `Bearer ${await signIn('bob@test.com')}`);

            const kins = await request(app).get('/api/connections').set('Authorization', `Bearer ${aliceToken}`);
            const message = await request(app)
                .post('/api/chat/messages')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ receiverId: bobId, content: 'Welcome back' });
            const carolDiscover = await request(app)
                .get('/api/matching')
                .set('Authorization', `Bearer ${getAuthToken(carol)}`);

            expect(kins.body.connections.map((u: { _id: string }) => u._id)).toEqual([bobId]);
            expect(message.status).toBe(201);
            expect(await Block.exists({ blocker: carol._id, blocked: bob._id })).toBeTruthy();
            expect(carolDiscover.body.matches.map((m: { _id: string }) => m._id)).not.toContain(bobId);
        });
    });
});
