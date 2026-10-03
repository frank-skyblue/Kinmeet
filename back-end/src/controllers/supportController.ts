import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { supportService } from '../services/supportService';

export const submitSupportRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { issueType, subject, message, followUp } = req.body;
    const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];

    const result = await supportService.submitSupportRequest(userId, {
        issueType,
        subject,
        message,
        followUp,
        screenshotBuffers: files.map((file) => file.buffer),
    });

    return res.status(201).json({
        success: true,
        message: 'Support request submitted successfully',
        ...result,
    });
});
