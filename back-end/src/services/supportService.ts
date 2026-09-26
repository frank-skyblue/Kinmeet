import crypto from 'crypto';
import { SupportRequest, SupportIssueType, ISupportRequestScreenshot } from '../models/SupportRequest';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { destroyImageByPublicId, uploadImageAsset } from './cloudinaryService';

const SUPPORT_SCREENSHOTS_SUBFOLDER = 'support-screenshots';

interface SubmitSupportRequestInput {
    issueType: SupportIssueType;
    subject?: string;
    message: string;
    followUp: boolean;
    screenshotBuffers?: Buffer[];
}

const cleanupUploadedScreenshots = async (screenshots: ISupportRequestScreenshot[]) => {
    await Promise.all(screenshots.map(async ({ publicId }) => {
        try {
            await destroyImageByPublicId(publicId);
        } catch (error) {
            console.error(`[supportService] Failed to clean up screenshot ${publicId}:`, error);
        }
    }));
};

export const supportService = {
    submitSupportRequest: async (
        userId: string,
        { issueType, subject, message, followUp, screenshotBuffers = [] }: SubmitSupportRequestInput,
    ) => {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const screenshots: ISupportRequestScreenshot[] = [];

        try {
            for (const buffer of screenshotBuffers) {
                const uploaded = await uploadImageAsset(buffer, {
                    subfolder: SUPPORT_SCREENSHOTS_SUBFOLDER,
                    publicId: `${userId}-${crypto.randomUUID()}`,
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
            const supportRequest = new SupportRequest({
                userId,
                email: user.email,
                issueType,
                ...(subject ? { subject } : {}),
                message,
                screenshots,
                followUp,
            });
            await supportRequest.save();
            return { supportRequestId: supportRequest._id.toString() };
        } catch (error) {
            await cleanupUploadedScreenshots(screenshots);
            throw error;
        }
    },
};
