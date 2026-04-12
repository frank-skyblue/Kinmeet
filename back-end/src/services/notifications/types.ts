export interface ChatNotificationEnvelope {
    receiverUserId: string;
    senderUserId: string;
    messageId: string;
    senderDisplayName: string;
}

export interface NotificationChannel {
    readonly id: string;
    sendToUser(userId: string, envelope: ChatNotificationEnvelope): Promise<void>;
}
