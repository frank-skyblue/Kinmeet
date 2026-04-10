import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationService } from '../../services/notificationService';
import { webPushChannel } from '../../services/notifications/webPushChannel';

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
});
