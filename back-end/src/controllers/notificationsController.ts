import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { deviceSubscriptionService } from '../services/deviceSubscriptionService';

export const registerDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { channel, token } = req.body;

    await deviceSubscriptionService.register(userId, channel, token);

    return res.status(200).json({ success: true, message: 'Device registered' });
});

export const unregisterDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { channel, token } = req.body;

    await deviceSubscriptionService.unregister(userId, channel, token);

    return res.status(200).json({ success: true, message: 'Device unregistered' });
});
