import type { MessageType } from '../../models/Message';

export interface ChatNotificationEnvelope {
    receiverUserId: string;
    senderUserId: string;
    messageId: string;
    senderDisplayName: string;
    /** Decides the notification text; text when absent. */
    messageType?: MessageType;
}

export interface NotificationChannel {
    readonly id: string;
    sendToUser(userId: string, envelope: ChatNotificationEnvelope): Promise<void>;
}
