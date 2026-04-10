import type { ChatNotificationEnvelope, NotificationChannel } from './notifications/types';
import { webPushChannel } from './notifications/webPushChannel';

const channels: NotificationChannel[] = [webPushChannel];

export const notificationService = {
    notifyChatMessage: async (envelope: ChatNotificationEnvelope): Promise<void> => {
        await Promise.all(
            channels.map(async (channel) => {
                try {
                    await channel.sendToUser(envelope.receiverUserId, envelope);
                } catch (err) {
                    console.error(`[notificationService] channel ${channel.id} failed:`, err);
                }
            }),
        );
    },
};
