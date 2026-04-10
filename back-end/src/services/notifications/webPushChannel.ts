import admin from 'firebase-admin';
import { FIREBASE_SERVICE_ACCOUNT_JSON, WEB_APP_URL } from '../../config/env';
import { DeviceSubscription, WEB_PUSH_CHANNEL } from '../../models/DeviceSubscription';
import type { ChatNotificationEnvelope, NotificationChannel } from './types';

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

const isInvalidTokenError = (code: string | undefined): boolean =>
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/invalid-argument';

export const webPushChannel: NotificationChannel = {
    id: WEB_PUSH_CHANNEL,

    sendToUser: async (userId: string, envelope: ChatNotificationEnvelope) => {
        const messaging = getMessaging();
        if (!messaging) {
            return;
        }

        const subs = await DeviceSubscription.find({
            userId,
            channel: WEB_PUSH_CHANNEL,
        }).lean();

        if (subs.length === 0) return;

        const title = 'KinMeet';
        const body = `${envelope.senderDisplayName} sent you a message`;
        const clickPath = `/chat/${envelope.senderUserId}`;

        const absoluteLink =
            WEB_APP_URL.length > 0 ? `${WEB_APP_URL}${clickPath}` : undefined;

        const messages: admin.messaging.Message[] = subs.map((sub) => ({
            token: sub.token,
            notification: { title, body },
            data: {
                type: 'chat_message',
                senderId: envelope.senderUserId,
                messageId: envelope.messageId,
                clickPath,
            },
            ...(absoluteLink
                ? {
                    webpush: {
                        fcmOptions: {
                            link: absoluteLink,
                        },
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
    },
};
