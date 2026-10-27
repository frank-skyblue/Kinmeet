import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { deviceSubscriptionService } from '../services/deviceSubscriptionService';
import { notificationPreferencesService } from '../services/notificationPreferencesService';

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

export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const preferences = await notificationPreferencesService.get(req.user!.id);
    return res.status(200).json({ success: true, preferences });
});

export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { newPeopleNearby } = req.body as { newPeopleNearby: { email?: boolean; push?: boolean } };
    const preferences = await notificationPreferencesService.updateNewPeopleNearby(
        req.user!.id,
        newPeopleNearby,
    );
    return res.status(200).json({ success: true, message: 'Preferences updated', preferences });
});