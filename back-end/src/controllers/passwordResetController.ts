import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { passwordResetService } from '../services/passwordResetService';

export const PASSWORD_RESET_REQUEST_MESSAGE =
    "If an account exists for this email, we'll send password reset instructions.";

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    await passwordResetService.requestPasswordReset(email);
    return res.status(200).json({
        success: true,
        message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await passwordResetService.resetPassword(token, newPassword);
    return res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now sign in with your new password.',
    });
});
