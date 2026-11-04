import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { rateLimitPerUser } from '../middleware/rateLimit';
import {
    sendMessageSchema,
    markAsReadSchema,
    userIdParams,
    signAttachmentSchema,
    conversationQuerySchema,
} from '../middleware/schemas';
import {
    sendMessage,
    getConversation,
    getConversations,
    markAsRead,
    createUploadPass,
    handleUploadNotification,
} from '../controllers/chatController';

const router = express.Router();

// Registered before router.use(authenticateJWT): Cloudinary calls this, signed with the API secret.
router.post('/attachments/upload-notification', handleUploadNotification);

router.use(authenticateJWT);

router.get('/conversations', getConversations);
router.get(
    '/conversations/:userId',
    validate(userIdParams, 'params'),
    validate(conversationQuerySchema, 'query'),
    getConversation,
);
router.post('/messages', validate(sendMessageSchema), sendMessage);
router.post('/messages/read', validate(markAsReadSchema), markAsRead);
router.post(
    '/attachments/sign',
    rateLimitPerUser({ windowMs: 60_000, max: 30, message: 'Too many uploads, please wait a moment' }),
    validate(signAttachmentSchema),
    createUploadPass,
);

export default router;
