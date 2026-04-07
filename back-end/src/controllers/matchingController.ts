import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import * as matchingService from '../services/matchingService';

export const getMatches = asyncHandler(async (req: AuthRequest, res: Response) => {
    const matches = await matchingService.getMatches(req.user!.id);
    return res.status(200).json({ success: true, matches });
});

export const sendMeetRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { receiverId } = req.body;
    const request = await matchingService.sendMeetRequest(req.user!.id, receiverId);
    return res.status(201).json({ success: true, message: 'Meet request sent successfully', request });
});

export const passUser = asyncHandler(async (_req: AuthRequest, res: Response) => {
    return res.status(200).json({ success: true, message: 'User passed' });
});
