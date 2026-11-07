import express from 'express';
import type { IncomingMessage } from 'http';

export const CLOUDINARY_NOTIFICATION_PATH = '/api/chat/attachments/upload-notification';

export interface RawBodyRequest extends IncomingMessage {
    rawBody?: string;
}

/**
 * express.json() that also keeps the exact request text for Cloudinary upload notifications:
 * their signature covers the raw body, and re-serialising the parsed JSON could change it.
 */
export const jsonBody = express.json({
    verify: (req: RawBodyRequest & { originalUrl?: string }, _res, buf) => {
        const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
        if (path === CLOUDINARY_NOTIFICATION_PATH) {
            req.rawBody = buf.toString('utf8');
        }
    },
});
