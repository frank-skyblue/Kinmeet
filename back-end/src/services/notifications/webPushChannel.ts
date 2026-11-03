import admin from 'firebase-admin';
import { FIREBASE_SERVICE_ACCOUNT_JSON, WEB_APP_URL } from '../../config/env';
import { DeviceSubscription, WEB_PUSH_CHANNEL } from '../../models/DeviceSubscription';
import type { ChatNotificationEnvelope, NotificationChannel } from './types';
import type { MessageType } from '../../models/Message';

let firebaseApp: admin.app.App | undefined;

const getMessaging = (): admin.messaging.Messaging | null => {
    if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
        return null;
    }
    if (!firebaseApp) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(
                FIREBASE_SERVICE_ACCOUNT_JSON as admin.ServiceAccount,
            ),
        });
    }
    return admin.messaging(firebaseApp);
};

const NOTIFICATION_SUBJECT: Record<MessageType, string> = {
    text: 'a message',
    image: 'a photo',
    voice: 'a voice message',
};

const isInvalidTokenError = (code: string | undefined): boolean =>
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/invalid-argument';

/** One push notification. `clickPath` is the app page opened when it is clicked. */
export interface WebPushMessage {
    title: string;
    body: string;
    clickPath: string;
    /**
     * Notifications with the same tag replace each other on the device instead of stacking.
     * Defaults to the message id for chat.
     */
    tag?: string;
    /** Extra string fields for the service worker. */
    data?: Record<string, string>;
}

/**
 * Sends to every web push device the user registered, and forgets tokens FCM rejects.
 * Returns how many devices accepted it: 0 when Firebase is off or the user has no devices.
 */
const sendToDevices = async (userId: string, message: WebPushMessage): Promise<number> => {
    const messaging = getMessaging();
    if (!messaging) {
        return 0;
    }

    const subs = await DeviceSubscription.find({
        userId,
        channel: WEB_PUSH_CHANNEL,
    }).lean();

    if (subs.length === 0) return 0;

    const { title, body, clickPath, tag } = message;
    const absoluteLink =
        WEB_APP_URL.length > 0 ? `${WEB_APP_URL}${clickPath}` : undefined;

    const messages: admin.messaging.Message[] = subs.map((sub) => ({
        token: sub.token,
        notification: { title, body },
        data: {
            ...message.data,
            clickPath,
            ...(tag ? { tag } : {}),
        },
        // The tag is set here as well as in `data`, for browsers where FCM shows the
        // notification itself instead of the service worker.
        ...(absoluteLink || tag
            ? {
                webpush: {
                    ...(tag ? { notification: { tag } } : {}),
                    ...(absoluteLink ? { fcmOptions: { link: absoluteLink } } : {}),
                },
            }
            : {}),
    }));

    const result = await messaging.sendEach(messages);

    const tokensToRemove: string[] = [];
    result.responses.forEach((resp, i) => {
        if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (isInvalidTokenError(code)) {
                tokensToRemove.push(subs[i]!.token);
            } else {
                console.error('[webPushChannel] FCM send error:', code, resp.error.message);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        await DeviceSubscription.deleteMany({
            channel: WEB_PUSH_CHANNEL,
            token: { $in: tokensToRemove },
        });
    }
    return result.successCount;
};

export const webPushChannel: NotificationChannel & {
    sendPush(userId: string, message: WebPushMessage): Promise<number>;
} = {
    id: WEB_PUSH_CHANNEL,

    sendToUser: async (userId: string, envelope: ChatNotificationEnvelope) => {
        await sendToDevices(userId, {
            title: 'KinMeet',
            body: `${envelope.senderDisplayName} sent you ${NOTIFICATION_SUBJECT[envelope.messageType ?? 'text']}`,
            clickPath: `/chat/${envelope.senderUserId}`,
            data: {
                type: 'chat_message',
                senderId: envelope.senderUserId,
                messageId: envelope.messageId,
            },
        });
    },

    sendPush: sendToDevices,
};
