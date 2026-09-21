import crypto from 'crypto';
import jwt, { Jwt, JwtPayload } from 'jsonwebtoken';
import { Request, Response, type CookieOptions } from 'express';
import {
    ADMIN_COOKIE_SAME_SITE,
    ADMIN_PASS_KEY,
    JWT_SECRET,
    NODE_ENV,
    type AdminCookieSameSite,
    type NodeEnv,
} from '../config/env';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { Feedback, FeedbackCategory, FeedbackStatus } from '../models/Feedback';

export const ADMIN_COOKIE_NAME = 'kinmeet_admin_session';
const ADMIN_COOKIE_PATH = '/api/admin';
const ADMIN_COOKIE_MAX_AGE_MS = 1_800_000;
const ADMIN_JWT_TYP = 'kinmeet-admin+jwt';
const ADMIN_JWT_ISSUER = 'kinmeet-admin';
const ADMIN_JWT_AUDIENCE = 'kinmeet-admin-api';
const ADMIN_JWT_SUBJECT = 'shared-admin';
const ADMIN_JWT_SCOPE = 'admin';

const sha256 = (value: string): Buffer => crypto.createHash('sha256').update(value, 'utf8').digest();

const passwordsMatch = (candidate: string, expected: string): boolean => {
    return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
};

const isJwtPayload = (value: unknown): value is JwtPayload =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const buildAdminCookieOptions = (
    sameSite: AdminCookieSameSite = ADMIN_COOKIE_SAME_SITE,
    nodeEnv: NodeEnv = NODE_ENV,
): CookieOptions => ({
    httpOnly: true,
    path: ADMIN_COOKIE_PATH,
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    sameSite,
    secure: sameSite === 'none' || nodeEnv === 'production',
});

const getAdminClearCookieOptions = (): CookieOptions => {
    const { httpOnly, path, sameSite, secure } = buildAdminCookieOptions();
    return { httpOnly, path, sameSite, secure };
};

// Admin token issuance and verification.
const login = (password: string): string => {
    if (!passwordsMatch(password, ADMIN_PASS_KEY)) {
        throw new AppError(401, 'Invalid credentials');
    }

    return jwt.sign(
        { scope: ADMIN_JWT_SCOPE },
        JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: '30m',
            issuer: ADMIN_JWT_ISSUER,
            audience: ADMIN_JWT_AUDIENCE,
            subject: ADMIN_JWT_SUBJECT,
            header: {
                alg: 'HS256',
                typ: ADMIN_JWT_TYP,
            },
        },
    );
};

export const verifyAdminToken = (token: string): void => {
    let decoded: Jwt;
    try {
        const verified = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: ADMIN_JWT_ISSUER,
            audience: ADMIN_JWT_AUDIENCE,
            subject: ADMIN_JWT_SUBJECT,
            complete: true,
        });
        if (typeof verified === 'string') {
            throw new AppError(401, 'Admin authentication required');
        }
        decoded = verified;
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(401, 'Admin authentication required');
    }

    if (decoded.header.typ !== ADMIN_JWT_TYP) {
        throw new AppError(401, 'Admin authentication required');
    }
    if (!isJwtPayload(decoded.payload) || decoded.payload.scope !== ADMIN_JWT_SCOPE) {
        throw new AppError(401, 'Admin authentication required');
    }
};

// Feedback projection and pagination.
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

const listFeedback = async (page: number): Promise<AdminFeedbackListResult> => {
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

// HTTP endpoints.
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const token = login(password);
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
