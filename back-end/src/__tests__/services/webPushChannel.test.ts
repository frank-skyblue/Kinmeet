import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { DeviceSubscription, WEB_PUSH_CHANNEL } from '../../models/DeviceSubscription';

const sendEachMock = vi.fn();

vi.mock('firebase-admin', () => ({
    default: {
        initializeApp: vi.fn(),
        credential: { cert: vi.fn() },
        messaging: vi.fn(() => ({
            sendEach: sendEachMock,
        })),
    },
}));

vi.mock('../../config/env', () => ({
    FIREBASE_SERVICE_ACCOUNT_JSON: {
        type: 'service_account',
        project_id: 'test',
        private_key: 'dummy',
        client_email: 'test@test.iam.gserviceaccount.com',
    },
    WEB_APP_URL: 'https://app.example.com',
}));

import { webPushChannel } from '../../services/notifications/webPushChannel';

describe('webPushChannel', () => {
    beforeEach(async () => {
        sendEachMock.mockReset();
        sendEachMock.mockResolvedValue({
            successCount: 1,
            failureCount: 0,
            responses: [{ success: true }],
        });

        await DeviceSubscription.deleteMany({});
    });

    it('sends FCM messages for stored web_push tokens', async () => {
        const userId = new mongoose.Types.ObjectId();
        await DeviceSubscription.create({
            userId,
            channel: WEB_PUSH_CHANNEL,
            token: 'fake-fcm-token',
        });

        await webPushChannel.sendToUser(userId.toString(), {
            receiverUserId: userId.toString(),
            senderUserId: '507f1f77bcf86cd799439012',
            messageId: '507f1f77bcf86cd799439013',
            senderDisplayName: 'Test Sender',
        });

        expect(sendEachMock).toHaveBeenCalledTimes(1);
        const payload = sendEachMock.mock.calls[0]![0] as Array<{
            token: string;
            data: Record<string, string>;
        }>;
        expect(payload[0]!.token).toBe('fake-fcm-token');
        expect(payload[0]!.data.type).toBe('chat_message');
        expect(payload[0]!.data.clickPath).toBe('/chat/507f1f77bcf86cd799439012');
    });

    it('removes invalid registration tokens', async () => {
        const userId = new mongoose.Types.ObjectId();
        await DeviceSubscription.create({
            userId,
            channel: WEB_PUSH_CHANNEL,
            token: 'bad-token',
        });

        sendEachMock.mockResolvedValue({
            successCount: 0,
            failureCount: 1,
            responses: [
                {
                    success: false,
                    error: {
                        code: 'messaging/registration-token-not-registered',
                        message: 'not registered',
                    },
                },
            ],
        });

        await webPushChannel.sendToUser(userId.toString(), {
            receiverUserId: userId.toString(),
            senderUserId: '507f1f77bcf86cd799439012',
            messageId: '507f1f77bcf86cd799439013',
            senderDisplayName: 'Test Sender',
        });

        const remaining = await DeviceSubscription.countDocuments();
        expect(remaining).toBe(0);
    });

    it('sends a general push with a replace-in-place tag and click path', async () => {
        const userId = new mongoose.Types.ObjectId();
        await DeviceSubscription.create({ userId, channel: WEB_PUSH_CHANNEL, token: 'fake-fcm-token' });

        const reached = await webPushChannel.sendPush(userId.toString(), {
            title: 'KinMeet',
            body: '2 new people from France joined near you',
            clickPath: '/discover',
            tag: 'kinmeet-new-people',
            data: { type: 'new_people_nearby' },
        });

        expect(reached).toBe(1);

        const [message] = sendEachMock.mock.calls[0]![0] as Array<{
            notification: { body: string };
            data: Record<string, string>;
            webpush: { notification: { tag: string }; fcmOptions: { link: string } };
        }>;
        expect(message!.notification.body).toBe('2 new people from France joined near you');
        expect(message!.data).toEqual({ type: 'new_people_nearby', clickPath: '/discover', tag: 'kinmeet-new-people' });
        expect(message!.webpush.notification.tag).toBe('kinmeet-new-people');
        expect(message!.webpush.fcmOptions.link).toBe('https://app.example.com/discover');
    });

    it('reports 0 devices reached when the user has none', async () => {
        const reached = await webPushChannel.sendPush(new mongoose.Types.ObjectId().toString(), {
            title: 'KinMeet',
            body: '1 new person from France joined near you',
            clickPath: '/discover',
        });

        expect(reached).toBe(0);
        expect(sendEachMock).not.toHaveBeenCalled();
    });
});
