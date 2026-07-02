import fs from 'fs';
import path from 'node:path';

const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
] as const;

const validateEnv = () => {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            'Check your .env file or deployment config.',
        );
    }
};

validateEnv();

export const JWT_SECRET = process.env.JWT_SECRET!;
export const MONGODB_URI = process.env.MONGODB_URI!;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!;

/**
 * Optional Firebase Admin credentials for FCM. If neither is set, web push sending is disabled.
 *
 * Prefer FIREBASE_SERVICE_ACCOUNT_PATH: path to the downloaded JSON file (short .env value; avoids
 * huge secrets in process.env — debuggers often echo env into the terminal command line).
 */
const loadFirebaseServiceAccount = (): Record<string, unknown> | null => {
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
    if (filePath) {
        const resolved = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(resolved)) {
            throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH file not found: ${resolved}`);
        }
        const rawFile = fs.readFileSync(resolved, 'utf8');
        try {
            return JSON.parse(rawFile) as Record<string, unknown>;
        } catch {
            throw new Error(`Invalid JSON in FIREBASE_SERVICE_ACCOUNT_PATH file: ${resolved}`);
        }
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw?.trim()) return null;
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        throw new Error(
            'Invalid FIREBASE_SERVICE_ACCOUNT_JSON: must be valid JSON (minified service account object).',
        );
    }
};

export const FIREBASE_SERVICE_ACCOUNT_JSON = loadFirebaseServiceAccount();

/** Public SPA origin (no trailing slash). Used for FCM web push click links (HTTPS in production). */
export const WEB_APP_URL = (process.env.WEB_APP_URL ?? '').replace(/\/$/, '');

/**
 * Resend transactional email.
 *
 * RESEND_API_KEY    — Required to send email. If absent, email sending is silently disabled.
 * EMAIL_FROM        — Sender address (defaults to noreply@kinmeet.ca).
 * ENABLE_DEVELOPMENT_EMAIL — Set to "true" to send real emails when NODE_ENV=development.
 *                    In development without this flag, sends are skipped and logged instead.
 */
export const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || null;
export const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || 'KinMeet <noreply@kinmeet.ca>';
export const ENABLE_DEVELOPMENT_EMAIL = process.env.ENABLE_DEVELOPMENT_EMAIL?.trim() === 'true';
