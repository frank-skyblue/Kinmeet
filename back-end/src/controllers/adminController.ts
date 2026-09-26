import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
    ADMIN_COOKIE_NAME,
    buildAdminCookieOptions,
    getAdminClearCookieOptions,
    issueAdminToken,
} from '../services/adminAuthService';
import { listFeedback } from '../services/adminFeedbackService';
import { listReports, updateReportStatus } from '../services/adminReportService';
import type { ReportStatus } from '../models/Report';

export { ADMIN_COOKIE_NAME, verifyAdminToken } from '../services/adminAuthService';

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const token = issueAdminToken(password);
    res.cookie(ADMIN_COOKIE_NAME, token, buildAdminCookieOptions());
    return res.status(200).json({
        success: true,
        message: 'Admin login successful',
    });
});

export const adminSession = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        authenticated: true,
    });
});

export const adminLogout = asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(ADMIN_COOKIE_NAME, getAdminClearCookieOptions());
    return res.status(200).json({
        success: true,
        message: 'Admin logout successful',
    });
});

export const listAdminFeedback = asyncHandler(async (req: Request, res: Response) => {
    const { page } = req.query as unknown as { page: number };
    const result = await listFeedback(page);
    return res.status(200).json({
        success: true,
        ...result,
    });
});

export const listAdminReports = asyncHandler(async (req: Request, res: Response) => {
    const { page } = req.query as unknown as { page: number };
    const result = await listReports(page);
    return res.status(200).json({
        success: true,
        ...result,
    });
});

export const updateAdminReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params as { reportId: string };
    const { status } = req.body as { status: ReportStatus };
    const report = await updateReportStatus(reportId, status);
    return res.status(200).json({
        success: true,
        report,
    });
});
