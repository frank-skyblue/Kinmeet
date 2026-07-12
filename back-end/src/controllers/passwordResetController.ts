import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { passwordResetService } from '../services/passwordResetService';

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    await passwordResetService.requestPasswordReset(email);
    return res.status(200).json({
        success: true,
        message: 'Password reset link sent. Please check your email.',
    });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await passwordResetService.resetPassword(token, newPassword);
    return res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
    });
});
