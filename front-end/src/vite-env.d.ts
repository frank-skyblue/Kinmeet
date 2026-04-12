/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_VAPID_KEY?: string;
    /** Google Analytics / Firebase Analytics measurement ID (e.g. G-XXXXXXXX) — optional; enables Analytics in push flow */
    readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
    /** Dev only: set to `true` to register FCM / request permission locally (`vite dev`). Ignored in production. */
    readonly VITE_ENABLE_WEB_PUSH?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
