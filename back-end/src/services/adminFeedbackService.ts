import { Feedback, FeedbackCategory, FeedbackStatus } from '../models/Feedback';

const ADMIN_FEEDBACK_PAGE_SIZE = 20;

interface AdminFeedbackScreenshot {
    url: string;
}

interface AdminFeedbackItem {
    id: string;
    email: string;
    category: FeedbackCategory;
    message: string;
    screenshots: AdminFeedbackScreenshot[];
    followUp: boolean;
    status: FeedbackStatus;
    createdAt: string;
}

interface AdminFeedbackListResult {
    feedback: AdminFeedbackItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

interface FeedbackListDocument {
    _id: { toString(): string };
    email: string;
    category: FeedbackCategory;
    message: string;
    screenshots?: Array<{ url?: string }>;
    followUp: boolean;
    status: FeedbackStatus;
    createdAt: Date;
}

const isHttpsUrl = (url: string): boolean => {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
};

const mapScreenshots = (screenshots: Array<{ url?: string }> | undefined): AdminFeedbackScreenshot[] => {
    if (!Array.isArray(screenshots)) return [];
    return screenshots.flatMap((screenshot) => {
        if (typeof screenshot?.url !== 'string' || !isHttpsUrl(screenshot.url)) {
            return [];
        }
        return [{ url: screenshot.url }];
    });
};

const toAdminFeedbackItem = (doc: FeedbackListDocument): AdminFeedbackItem => ({
    id: doc._id.toString(),
    email: doc.email,
    category: doc.category,
    message: doc.message,
    screenshots: mapScreenshots(doc.screenshots),
    followUp: doc.followUp,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
});

export const listFeedback = async (page: number): Promise<AdminFeedbackListResult> => {
    const total = await Feedback.countDocuments();
    const totalPages = total === 0 ? 0 : Math.ceil(total / ADMIN_FEEDBACK_PAGE_SIZE);

    if (total === 0 || page > totalPages) {
        return {
            feedback: [],
            pagination: {
                page,
                pageSize: ADMIN_FEEDBACK_PAGE_SIZE,
                total,
                totalPages,
            },
        };
    }

    const docs = await Feedback.find()
        .select({
            _id: 1,
            email: 1,
            category: 1,
            message: 1,
            'screenshots.url': 1,
            followUp: 1,
            status: 1,
            createdAt: 1,
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * ADMIN_FEEDBACK_PAGE_SIZE)
        .limit(ADMIN_FEEDBACK_PAGE_SIZE)
        .lean<FeedbackListDocument[]>();

    return {
        feedback: docs.map(toAdminFeedbackItem),
        pagination: {
            page,
            pageSize: ADMIN_FEEDBACK_PAGE_SIZE,
            total,
            totalPages,
        },
    };
};
