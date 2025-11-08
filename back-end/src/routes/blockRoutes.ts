import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser
} from '../controllers/blockController';

const router = express.Router();

// All block routes require authentication
router.use(authenticateJWT);

router.post('/block', blockUser);
router.delete('/unblock/:userId', unblockUser);
router.get('/blocked', getBlockedUsers);
router.post('/report', reportUser);

export default router;

