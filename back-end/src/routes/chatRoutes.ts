import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { sendMessageSchema, markAsReadSchema, userIdParams } from '../middleware/schemas';
import {
    sendMessage,
    getConversation,
    getConversations,
    markAsRead
} from '../controllers/chatController';

const router = express.Router();

router.use(authenticateJWT);

router.get('/conversations', getConversations);
router.get('/conversations/:userId', validate(userIdParams, 'params'), getConversation);
router.post('/messages', validate(sendMessageSchema), sendMessage);
router.post('/messages/read', validate(markAsReadSchema), markAsRead);

export default router;
