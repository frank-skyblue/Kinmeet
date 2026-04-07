import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { blockUserSchema, reportUserSchema, userIdParams } from '../middleware/schemas';
import {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser
} from '../controllers/blockController';

const router = express.Router();

router.use(authenticateJWT);

router.post('/block', validate(blockUserSchema), blockUser);
router.delete('/unblock/:userId', validate(userIdParams, 'params'), unblockUser);
router.get('/blocked', getBlockedUsers);
router.post('/report', validate(reportUserSchema), reportUser);

export default router;
