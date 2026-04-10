import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAnalytics,
    isSupported as isAnalyticsSupported,
    logEvent,
    type Analytics,
} from 'firebase/analytics';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { notificationsAPI } from './api';

const FCM_TOKEN_STORAGE_KEY = 'fcmRegistrationToken';

/**
 * In `vite dev`, web push is off unless `VITE_ENABLE_WEB_PUSH=true` so local Firebase creds
 * do not prompt for notification permission on every login. Production builds are unaffected.
 */
const isWebPushAllowedInCurrentMode = (): boolean => {
    if (!import.meta.env.DEV) return true;
    return import.meta.env.VITE_ENABLE_WEB_PUSH === 'true';
};

const getFirebaseConfig = () => ({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
});

export const isFirebasePushConfigured = (): boolean => {
    const c = getFirebaseConfig();
    const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    return Boolean(
        c.apiKey &&
            c.authDomain &&
            c.projectId &&
            c.messagingSenderId &&
            c.appId &&
            vapid?.trim(),
    );
};

let firebaseApp: FirebaseApp | undefined;
let firebaseAnalytics: Analytics | null | undefined;

const getOrInitApp = (): FirebaseApp | null => {
    if (!isFirebasePushConfigured()) return null;
    if (!firebaseApp) {
        const c = getFirebaseConfig();
        firebaseApp = initializeApp({
            apiKey: c.apiKey!,
            authDomain: c.authDomain!,
            projectId: c.projectId!,
            storageBucket:
                c.storageBucket ??
                (c.projectId ? `${c.projectId}.appspot.com` : undefined),
            messagingSenderId: c.messagingSenderId!,
            appId: c.appId!,
            ...(c.measurementId?.trim() ? { measurementId: c.measurementId.trim() } : {}),
        });
    }
    return firebaseApp;
};

/**
 * Resolves Firebase Analytics when the browser supports it and `VITE_FIREBASE_MEASUREMENT_ID` is set.
 * Cached after first successful init.
 */
export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
    const app = getOrInitApp();
    if (!app) return null;
    if (firebaseAnalytics !== undefined) return firebaseAnalytics;

    const c = getFirebaseConfig();
    if (!c.measurementId?.trim()) {
        firebaseAnalytics = null;
        return null;
    }

    try {
        if (!(await isAnalyticsSupported())) {
            firebaseAnalytics = null;
            return null;
        }
        firebaseAnalytics = getAnalytics(app);
        return firebaseAnalytics;
    } catch {
        firebaseAnalytics = null;
        return null;
    }
};

/**
 * Requests permission (if needed), obtains FCM token, registers with KinMeet API.
 * No-op if Firebase env is incomplete, messaging unsupported, or permission denied.
 */
export const registerWebPushForCurrentUser = async (): Promise<void> => {
    if (!isWebPushAllowedInCurrentMode()) return;

    const app = getOrInitApp();
    if (!app) return;

    if (!('Notification' in window)) return;

    const supported = await isSupported();
    if (!supported) return;

    if (Notification.permission === 'denied') return;

    const permission =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
    const fcmToken = await getToken(messaging, { vapidKey });
    if (!fcmToken) return;

    const previous = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (previous && previous !== fcmToken) {
        try {
            await notificationsAPI.unregisterDevice({ channel: 'web_push', token: previous });
        } catch {
            /* best-effort cleanup */
        }
    }

    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
    await notificationsAPI.registerDevice({ channel: 'web_push', token: fcmToken });

    const analytics = await getFirebaseAnalytics();
    if (analytics) {
        logEvent(analytics, 'push_notification_opt_in', { channel: 'web_push' });
    }
};

export const unregisterWebPushForCurrentUser = async (): Promise<void> => {
    const stored = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (!stored) return;
    try {
        await notificationsAPI.unregisterDevice({ channel: 'web_push', token: stored });
    } catch {
        /* still clear local token */
    }
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);

    const analytics = await getFirebaseAnalytics();
    if (analytics) {
        logEvent(analytics, 'push_notification_opt_out', { channel: 'web_push' });
    }
};
