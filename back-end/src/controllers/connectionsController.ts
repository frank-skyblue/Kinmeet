import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import * as connectionService from '../services/connectionService';

export const getConnectionRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const requests = await connectionService.getConnectionRequests(req.user!.id);
    return res.status(200).json({ success: true, requests });
});

export const acceptConnectionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { requestId } = req.params;
    const connection = await connectionService.acceptConnectionRequest(req.user!.id, requestId);
    return res.status(200).json({ success: true, message: 'Connection request accepted', connection });
});

export const ignoreConnectionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { requestId } = req.params;
    await connectionService.ignoreConnectionRequest(req.user!.id, requestId);
    return res.status(200).json({ success: true, message: 'Connection request ignored' });
});

export const getConnections = asyncHandler(async (req: AuthRequest, res: Response) => {
    const connections = await connectionService.getConnections(req.user!.id);
    return res.status(200).json({ success: true, connections });
});

export const removeConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    await connectionService.removeConnection(req.user!.id, userId);
    return res.status(200).json({ success: true, message: 'Connection removed' });
});
