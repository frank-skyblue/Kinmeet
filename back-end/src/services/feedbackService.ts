import multer, { FileFilterCallback } from 'multer';
import { Feedback, FeedbackCategory, IFeedbackScreenshot } from '../models/Feedback';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { destroyImageByPublicId, uploadImageAsset } from './cloudinaryService';

const FEEDBACK_SCREENSHOTS_SUBFOLDER = 'feedback-screenshots';

const fileFilter = (_req: AuthRequest, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
};

export const feedbackUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

interface SubmitFeedbackInput {
    category: FeedbackCategory;
    message: string;
    followUp: boolean;
    screenshotBuffers?: Buffer[];
}

const cleanupUploadedScreenshots = async (screenshots: IFeedbackScreenshot[]) => {
    await Promise.all(screenshots.map(async ({ publicId }) => {
        try {
            await destroyImageByPublicId(publicId);
        } catch (error) {
            console.error(`[feedbackService] Failed to clean up screenshot ${publicId}:`, error);
        }
    }));
};

export const feedbackService = {
    submitFeedback: async (
        userId: string,
        { category, message, followUp, screenshotBuffers = [] }: SubmitFeedbackInput,
    ) => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const screenshots: IFeedbackScreenshot[] = [];
        const uploadTimestamp = Date.now();

        try {
            for (let index = 0; index < screenshotBuffers.length; index++) {
                const uploaded = await uploadImageAsset(screenshotBuffers[index], {
                    subfolder: FEEDBACK_SCREENSHOTS_SUBFOLDER,
                    publicId: `${userId}-${uploadTimestamp}-${index + 1}`,
                    transformation: [
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                });
                screenshots.push(uploaded);
            }
        } catch {
            await cleanupUploadedScreenshots(screenshots);
            throw new AppError(502, 'Screenshot upload failed. Please try again later or submit without screenshots.');
        }

        try {
            const feedback = new Feedback({
                userId,
                category,
                message,
                screenshots,
                followUp,
            });
            await feedback.save();
            return { feedbackId: feedback._id.toString() };
        } catch (error) {
            await cleanupUploadedScreenshots(screenshots);
            throw error;
        }
    },
};
