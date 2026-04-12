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
});
