import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { blockService } from '../services/blockService';

export const blockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { userId: blockedUserId, reason } = req.body;

    await blockService.blockUser(userId, blockedUserId, reason);

    return res.status(201).json({ success: true, message: 'User blocked successfully' });
});

export const unblockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { userId: blockedUserId } = req.params;

    await blockService.unblockUser(userId, blockedUserId);

    return res.status(200).json({ success: true, message: 'User unblocked successfully' });
});

export const getBlockedUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const blockedUsers = await blockService.getBlockedUsers(userId);

    return res.status(200).json({ success: true, blockedUsers });
});

export const reportUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { userId: reportedUserId, reason } = req.body;

    await blockService.reportUser(userId, reportedUserId, reason);

    return res.status(201).json({ success: true, message: 'User reported and blocked successfully' });
});
