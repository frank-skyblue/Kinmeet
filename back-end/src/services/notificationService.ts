import type { ChatNotificationEnvelope, NotificationChannel } from './notifications/types';
import { webPushChannel } from './notifications/webPushChannel';
import { isAccountDeactivated } from '../models/User';

const channels: NotificationChannel[] = [webPushChannel];

export const notificationService = {
    notifyChatMessage: async (envelope: ChatNotificationEnvelope): Promise<void> => {
        // Paused, not queued: device subscriptions are kept so pushes resume after
        // reactivation, but nothing missed while deactivated is replayed.
        if (await isAccountDeactivated(envelope.receiverUserId)) return;

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
