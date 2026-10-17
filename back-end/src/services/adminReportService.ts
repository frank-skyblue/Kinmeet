import { Report, type ReportReason, type ReportStatus } from '../models/Report';
import { AppError } from '../middleware/errorHandler';

const ADMIN_REPORTS_PAGE_SIZE = 20;

interface AdminReportItem {
    id: string;
    reporterEmail: string;
    reportedEmail: string;
    reportedName: string;
    reason: ReportReason;
    details?: string;
    status: ReportStatus;
    createdAt: string;
}

interface AdminReportListResult {
    reports: AdminReportItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

interface ReportUserRef {
    email?: string;
    firstName?: string;
}

interface ReportListDocument {
    _id: { toString(): string };
    reporter?: ReportUserRef | null;
    reported?: ReportUserRef | null;
    reason: ReportReason;
    details?: string;
    status: ReportStatus;
    createdAt: Date;
}

const toAdminReportItem = (doc: ReportListDocument): AdminReportItem => ({
    id: doc._id.toString(),
    reporterEmail: doc.reporter?.email ?? '',
    reportedEmail: doc.reported?.email ?? '',
    reportedName: doc.reported?.firstName ?? '',
    reason: doc.reason,
    ...(doc.details ? { details: doc.details } : {}),
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
});

export const listReports = async (page: number): Promise<AdminReportListResult> => {
    const total = await Report.countDocuments();
    const totalPages = total === 0 ? 0 : Math.ceil(total / ADMIN_REPORTS_PAGE_SIZE);

    const pagination = {
        page,
        pageSize: ADMIN_REPORTS_PAGE_SIZE,
        total,
        totalPages,
    };

    if (total === 0 || page > totalPages) {
        return { reports: [], pagination };
    }

    const docs = await Report.find()
        .select({ _id: 1, reporter: 1, reported: 1, reason: 1, details: 1, status: 1, createdAt: 1 })
        .populate('reporter', 'email')
        .populate('reported', 'email firstName')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * ADMIN_REPORTS_PAGE_SIZE)
        .limit(ADMIN_REPORTS_PAGE_SIZE)
        .lean<ReportListDocument[]>();

    return { reports: docs.map(toAdminReportItem), pagination };
};

export const updateReportStatus = async (reportId: string, status: ReportStatus): Promise<AdminReportItem> => {
    const report = await Report.findByIdAndUpdate(
        reportId,
        { status },
        { new: true, runValidators: true },
    )
        .select({ _id: 1, reporter: 1, reported: 1, reason: 1, details: 1, status: 1, createdAt: 1 })
        .populate('reporter', 'email')
        .populate('reported', 'email firstName')
        .lean<ReportListDocument | null>();

    if (!report) throw new AppError(404, 'Report not found');
    return toAdminReportItem(report);
};
