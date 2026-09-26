import { Report, type ReportReason } from '../models/Report';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export const reportService = {
    /**
     * Records a report for moderator review.
     *
     * Reporting is deliberately independent of blocking: it does not create a Block,
     * does not tear down the connection, and does not notify the reported user.
     * Blocking is offered to the reporter as a separate, opt-in action.
     */
    submitReport: async (
        reporterId: string,
        reportedUserId: string,
        reason: ReportReason,
        details?: string,
    ) => {
        if (reporterId === reportedUserId) {
            throw new AppError(400, 'Cannot report yourself');
        }

        // "Other" carries no meaning on its own, so it must be explained.
        if (reason === 'Other' && !details?.trim()) {
            throw new AppError(400, 'Please describe the issue when choosing Other');
        }

        const reported = await User.findById(reportedUserId);
        if (!reported) throw new AppError(404, 'User not found');

        const trimmedDetails = details?.trim();

        const report = new Report({
            reporter: reporterId,
            reported: reportedUserId,
            reason,
            ...(trimmedDetails ? { details: trimmedDetails } : {}),
        });
        await report.save();

        return report;
    },
};
