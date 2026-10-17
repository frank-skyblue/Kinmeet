import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { v2 as cloudinary } from 'cloudinary';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Attachment } from '../../models/Attachment';
import { Block } from '../../models/Block';
import { Connection } from '../../models/Connection';
import { Message } from '../../models/Message';
import { attachmentService } from '../../services/attachmentService';
import { CLOUDINARY_NOTIFICATION_PATH } from '../../middleware/jsonBody';

const app = createTestApp();
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

const createPair = async ({ connected = true } = {}) => {
    const alice = await createTestUser({ email: 'alice@test.com', firstName: 'Alice' });
    const bob = await createTestUser({ email: 'bob@test.com', firstName: 'Bob' });
    if (connected) await Connection.create({ user1: alice._id, user2: bob._id });
    return { alice, bob, aliceToken: getAuthToken(alice), bobToken: getAuthToken(bob), bobId: bob._id.toString() };
};

const requestPass = (token: string, receiverId: string, kind: 'image' | 'voice' = 'image') =>
    request(app)
        .post('/api/chat/attachments/sign')
        .set('Authorization', `Bearer ${token}`)
        .send({ receiverId, kind });

// Receipts use Cloudinary's version-1 signing, which the SDK's type definitions don't expose.
const signV1 = cloudinary.utils.api_sign_request as unknown as (
    params: Record<string, unknown>, secret: string, algorithm: null, signatureVersion: number,
) => string;

/** The receipt Cloudinary would return for an upload: it signs public_id and version. */
const receiptFor = (publicId: string, version = 1728600000) => ({
    version,
    signature: signV1({ public_id: publicId, version }, API_SECRET, null, 1),
});

const issuePass = async (token: string, receiverId: string, kind: 'image' | 'voice' = 'image') => {
    const res = await requestPass(token, receiverId, kind);
    expect(res.status).toBe(201);
    return res.body.pass as { attachmentId: string; fields: Record<string, string>; uploadUrl: string };
};

const sendMedia = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send(body);

/** A Cloudinary upload notification, signed over the exact body like Cloudinary does. */
const notify = (payload: Record<string, unknown>, { secret = API_SECRET } = {}) => {
    const body = JSON.stringify({ notification_type: 'upload', ...payload });
    const timestamp = Math.round(Date.now() / 1000);
    const signature = crypto.createHash('sha1').update(body + timestamp + secret).digest('hex');
    return request(app)
        .post(CLOUDINARY_NOTIFICATION_PATH)
        .set('Content-Type', 'application/json')
        .set('X-Cld-Timestamp', String(timestamp))
        .set('X-Cld-Signature', signature)
        .send(body);
};

describe('Chat media', () => {
    let destroySpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        destroySpy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /api/chat/attachments/sign', () => {
        it('returns 401 without a token', async () => {
            const res = await request(app)
                .post('/api/chat/attachments/sign')
                .send({ receiverId: '507f1f77bcf86cd799439011', kind: 'image' });
            expect(res.status).toBe(401);
        });

        it('refuses a pass for someone the sender is not connected to', async () => {
            const { aliceToken, bobId } = await createPair({ connected: false });

            const res = await requestPass(aliceToken, bobId);

            expect(res.status).toBe(403);
            expect(await Attachment.countDocuments()).toBe(0);
        });

        it('refuses a pass when the users are blocked', async () => {
            const { alice, bob, aliceToken, bobId } = await createPair();
            await Block.create({ blocker: bob._id, blocked: alice._id });

            const res = await requestPass(aliceToken, bobId);

            expect(res.status).toBe(403);
        });

        it('rejects an unknown media kind', async () => {
            const { aliceToken, bobId } = await createPair();

            const res = await request(app)
                .post('/api/chat/attachments/sign')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ receiverId: bobId, kind: 'video' });

            expect(res.status).toBe(400);
        });

        it('issues a signed one-file pass and records a pending attachment', async () => {
            const { alice, aliceToken, bobId } = await createPair();

            const pass = await issuePass(aliceToken, bobId);

            const { api_key: _apiKey, signature, ...signed } = pass.fields;
            expect(pass.uploadUrl).toMatch(/\/image\/upload$/);
            expect(signed).toMatchObject({
                public_id: `kinmeet-dev/chat/${pass.attachmentId}`,
                type: 'authenticated',
                overwrite: 'false',
            });
            expect(signed.allowed_formats).toContain('jpg');
            expect(signature).toBe(cloudinary.utils.api_sign_request(signed, API_SECRET));
            expect(JSON.stringify(pass)).not.toContain(API_SECRET);

            const attachment = await Attachment.findById(pass.attachmentId);
            expect(attachment).toMatchObject({ status: 'pending', kind: 'image' });
            expect(attachment!.owner.toString()).toBe(alice._id.toString());
        });

        it('sends voice uploads to the video resource type', async () => {
            const { aliceToken, bobId } = await createPair();

            const pass = await issuePass(aliceToken, bobId, 'voice');

            expect(pass.uploadUrl).toMatch(/\/video\/upload$/);
            expect(pass.fields.allowed_formats).toContain('webm');
        });

        it('rate-limits pass requests per user', async () => {
            const { aliceToken, bobId } = await createPair();

            for (let i = 0; i < 30; i += 1) {
                expect((await requestPass(aliceToken, bobId)).status).toBe(201);
            }
            const limited = await requestPass(aliceToken, bobId);

            expect(limited.status).toBe(429);
        });
    });

    describe('sending media', () => {
        it('sends an image with a caption and returns signed viewing URLs, not the file id', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                content: 'Look at this',
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id), width: 1600, height: 1200 },
            });

            expect(res.status).toBe(201);
            const { message } = res.body;
            expect(message.type).toBe('image');
            expect(message.content).toBe('Look at this');
            expect(message.attachment).toMatchObject({ width: 1600, height: 1200 });
            expect(message.attachment.urls.display).toMatch(/\/image\/authenticated\/s--[^/]+--\//);
            expect(message.attachment.urls.full).toBeDefined();
            expect(message.attachment).not.toHaveProperty('publicId');
            expect((await Attachment.findById(pass.attachmentId))!.status).toBe('sent');
        });

        it('sends a voice message played back as mp3', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId, 'voice');

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: {
                    id: pass.attachmentId,
                    ...receiptFor(pass.fields.public_id),
                    durationMs: 12400,
                    waveform: [10, 120, 255, 30],
                },
            });

            expect(res.status).toBe(201);
            expect(res.body.message.type).toBe('voice');
            expect(res.body.message.attachment).toMatchObject({ durationMs: 12400, waveform: [10, 120, 255, 30] });
            expect(res.body.message.attachment.urls.audio).toMatch(/\/video\/authenticated\/.*\.mp3/);
        });

        it('rejects a caption on a voice message and keeps the upload usable', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId, 'voice');

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                content: 'caption',
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id), durationMs: 1000 },
            });

            expect(res.status).toBe(400);
            expect((await Attachment.findById(pass.attachmentId))!.status).toBe('pending');
        });

        it('rejects a forged receipt', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, version: 1, signature: 'a'.repeat(40) },
            });

            expect(res.status).toBe(400);
            expect(await Message.countDocuments()).toBe(0);
            expect((await Attachment.findById(pass.attachmentId))!.status).toBe('pending');
        });

        it("refuses someone else's upload", async () => {
            const { aliceToken, bobToken, bobId, alice } = await createPair();
            const pass = await issuePass(aliceToken, bobId);

            const res = await sendMedia(bobToken, {
                receiverId: alice._id.toString(),
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            });

            expect(res.status).toBe(404);
        });

        it('refuses to send the same upload twice', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            const attachment = { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) };

            expect((await sendMedia(aliceToken, { receiverId: bobId, attachment })).status).toBe(201);
            const second = await sendMedia(aliceToken, { receiverId: bobId, attachment });

            expect(second.status).toBe(409);
            expect(await Message.countDocuments()).toBe(1);
        });

        it('refuses an upload whose pass was issued over 15 minutes ago', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            await Attachment.collection.updateOne(
                { _id: new mongoose.Types.ObjectId(pass.attachmentId) },
                { $set: { createdAt: new Date(Date.now() - 16 * 60 * 1000) } },
            );

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            });

            expect(res.status).toBe(410);
        });

        it('returns the original message when a send is retried with the same clientMessageId', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            const body = {
                receiverId: bobId,
                clientMessageId: 'tmp-123',
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            };

            const first = await sendMedia(aliceToken, body);
            const retry = await sendMedia(aliceToken, body);

            expect(retry.status).toBe(201);
            expect(retry.body.message._id).toBe(first.body.message._id);
            expect(await Message.countDocuments()).toBe(1);
        });

        it('still requires content when there is no attachment', async () => {
            const { aliceToken, bobId } = await createPair();

            const res = await sendMedia(aliceToken, { receiverId: bobId, content: '   ' });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Message cannot be empty');
        });

        it('returns fresh signed URLs when the conversation is reopened', async () => {
            const { aliceToken, bobToken, bobId, alice } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            });

            const res = await request(app)
                .get(`/api/chat/conversations/${alice._id}`)
                .set('Authorization', `Bearer ${bobToken}`);

            expect(res.status).toBe(200);
            expect(res.body.messages[0].attachment.urls.display).toMatch(/\/authenticated\/s--/);
        });
    });

    describe('Cloudinary upload notifications', () => {
        it('rejects a notification with a bad signature', async () => {
            const res = await notify({ public_id: 'kinmeet-dev/chat/x', bytes: 10 }, { secret: 'wrong-secret' });

            expect(res.status).toBe(401);
        });

        it("stores Cloudinary's verified details on the sent message", async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            const sent = await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id), width: 9999, height: 9999 },
            });

            const res = await notify({
                public_id: pass.fields.public_id, bytes: 284311, format: 'jpg', width: 1600, height: 1200,
            });

            expect(res.status).toBe(200);
            const message = await Message.findById(sent.body.message._id);
            expect(message!.attachment).toMatchObject({ bytes: 284311, format: 'jpg', width: 1600, height: 1200 });
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('keeps an image right at the 5 MB limit', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            });

            await notify({ public_id: pass.fields.public_id, bytes: 5 * 1024 * 1024, format: 'jpg' });

            expect(destroySpy).not.toHaveBeenCalled();
            expect((await Attachment.findById(pass.attachmentId))!.status).toBe('sent');
        });

        it('removes already-sent media that breaks the size limit', async () => {
            const { aliceToken, bobToken, bobId, alice } = await createPair();
            const pass = await issuePass(aliceToken, bobId);
            await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id) },
            });

            await notify({ public_id: pass.fields.public_id, bytes: 5 * 1024 * 1024 + 1, format: 'jpg' });

            expect(destroySpy).toHaveBeenCalledWith(
                pass.fields.public_id,
                expect.objectContaining({ resource_type: 'image', type: 'authenticated' }),
            );
            expect((await Attachment.findById(pass.attachmentId))!.status).toBe('rejected');
            const conversation = await request(app)
                .get(`/api/chat/conversations/${alice._id}`)
                .set('Authorization', `Bearer ${bobToken}`);
            expect(conversation.body.messages[0].attachment).toMatchObject({ removed: true });
            expect(conversation.body.messages[0].attachment.urls).toBeUndefined();
        });

        it('blocks sending media that was rejected before it was sent', async () => {
            const { aliceToken, bobId } = await createPair();
            const pass = await issuePass(aliceToken, bobId, 'voice');
            await notify({ public_id: pass.fields.public_id, bytes: 1000, format: 'webm', duration: 600 });

            const res = await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: pass.attachmentId, ...receiptFor(pass.fields.public_id), durationMs: 5000 },
            });

            expect(res.status).toBe(422);
            expect(destroySpy).toHaveBeenCalledWith(
                pass.fields.public_id,
                expect.objectContaining({ resource_type: 'video' }),
            );
        });
    });

    describe('cleanup', () => {
        it('deletes uploads that were never sent after 24 hours, and keeps the rest', async () => {
            const { aliceToken, bobId } = await createPair();
            const stale = await issuePass(aliceToken, bobId);
            const fresh = await issuePass(aliceToken, bobId);
            const sentPass = await issuePass(aliceToken, bobId);
            await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: sentPass.attachmentId, ...receiptFor(sentPass.fields.public_id) },
            });
            const dayAndAnHourAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
            await Attachment.collection.updateMany(
                { publicId: { $in: [stale.fields.public_id, sentPass.fields.public_id] } },
                { $set: { createdAt: dayAndAnHourAgo } },
            );

            const removed = await attachmentService.cleanupOrphans();

            expect(removed).toBe(1);
            expect(destroySpy).toHaveBeenCalledTimes(1);
            expect(destroySpy).toHaveBeenCalledWith(stale.fields.public_id, expect.anything());
            expect(await Attachment.exists({ _id: fresh.attachmentId })).toBeTruthy();
            expect(await Attachment.exists({ _id: sentPass.attachmentId })).toBeTruthy();
        });

        it("deletes a user's sent and received media with their account", async () => {
            const { aliceToken, bobToken, bobId, alice } = await createPair();
            const fromAlice = await issuePass(aliceToken, bobId);
            const fromBob = await issuePass(bobToken, alice._id.toString());
            await sendMedia(aliceToken, {
                receiverId: bobId,
                attachment: { id: fromAlice.attachmentId, ...receiptFor(fromAlice.fields.public_id) },
            });
            await sendMedia(bobToken, {
                receiverId: alice._id.toString(),
                attachment: { id: fromBob.attachmentId, ...receiptFor(fromBob.fields.public_id) },
            });

            const res = await request(app).delete('/api/profile/me').set('Authorization', `Bearer ${aliceToken}`);

            expect(res.status).toBe(200);
            expect(destroySpy).toHaveBeenCalledTimes(2);
            expect(await Attachment.countDocuments()).toBe(0);
        });
    });
});
