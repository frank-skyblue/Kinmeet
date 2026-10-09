import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationService } from '../../services/notificationService';
import { webPushChannel } from '../../services/notifications/webPushChannel';
import { User } from '../../models/User';
import { createTestUser } from '../helpers';

describe('notificationService', () => {
    beforeEach(() => {
        vi.spyOn(webPushChannel, 'sendToUser').mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('invokes webPushChannel with chat envelope', async () => {
        const envelope = {
            receiverUserId: '507f1f77bcf86cd799439011',
            senderUserId: '507f1f77bcf86cd799439012',
            messageId: '507f1f77bcf86cd799439013',
            senderDisplayName: 'Ada Lovelace',
        };

        await notificationService.notifyChatMessage(envelope);

        expect(webPushChannel.sendToUser).toHaveBeenCalledTimes(1);
        expect(webPushChannel.sendToUser).toHaveBeenCalledWith(
            envelope.receiverUserId,
            envelope,
        );
    });

    it('skips delivery while the receiver is deactivated', async () => {
        const receiver = await createTestUser({ email: 'push-deactivated@test.com' });
        await User.updateOne({ _id: receiver._id }, { accountStatus: 'deactivated' });

        await notificationService.notifyChatMessage({
            receiverUserId: receiver._id.toString(),
            senderUserId: '507f1f77bcf86cd799439012',
            messageId: '507f1f77bcf86cd799439013',
            senderDisplayName: 'Ada Lovelace',
        });

        expect(webPushChannel.sendToUser).not.toHaveBeenCalled();
    });
});
