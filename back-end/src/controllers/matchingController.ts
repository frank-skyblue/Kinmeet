import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import * as matchingService from '../services/matchingService';

export const getMatches = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const matches = await matchingService.getMatches(userId);
    if (matches.length > 0) {
        return res.status(200).json({ success: true, matches });
    }
    const emptyState = await matchingService.getDiscoverEmptyState(userId);
    return res.status(200).json({ success: true, matches, emptyState });
});

export const sendMeetRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { receiverId } = req.body;
    const request = await matchingService.sendMeetRequest(req.user!.id, receiverId);
    return res.status(201).json({ success: true, message: 'Meet request sent successfully', request });
});

export const passUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.body as { userId: string };
    await matchingService.passUser(req.user!.id, userId);
    return res.status(200).json({ success: true, message: 'User passed' });
});
