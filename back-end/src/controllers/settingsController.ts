import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import { settingsService } from '../services/settingsService';

export const changeEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { newEmail, currentPassword } = req.body as {
        newEmail: string;
        currentPassword: string;
    };
    const result = await settingsService.changeEmail(req.user!.id, newEmail, currentPassword);
    return res.status(200).json({ success: true, message: 'Email updated successfully', ...result });
});

export const changeUsername = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { newUsername } = req.body as { newUsername: string };
    const result = await settingsService.changeUsername(req.user!.id, newUsername);
    return res.status(200).json({
        success: true,
        message: 'Username updated successfully',
        ...result,
    });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
    };
    await settingsService.changePassword(req.user!.id, currentPassword, newPassword);
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
});
