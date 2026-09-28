import { Feedback, FeedbackCategory, IFeedbackScreenshot } from '../models/Feedback';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { destroyImageByPublicId, uploadImageAsset } from './cloudinaryService';

const FEEDBACK_SCREENSHOTS_SUBFOLDER = 'feedback-screenshots';

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
                email: user.email,
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
