import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { feedbackService } from '../services/feedbackService';

export { feedbackUpload } from '../services/feedbackService';

export const submitFeedback = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { category, message, followUp } = req.body;
    const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];

    const result = await feedbackService.submitFeedback(userId, {
        category,
        message,
        followUp,
        screenshotBuffers: files.map((file) => file.buffer),
    });

    return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        ...result,
    });
});
