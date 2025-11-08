import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import {
    sendMessage,
    getConversation,
    getConversations,
    markAsRead
} from '../controllers/chatController';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateJWT);

router.get('/conversations', getConversations);
router.get('/conversations/:userId', getConversation);
router.post('/messages', sendMessage);
router.post('/messages/read', markAsRead);

export default router;

