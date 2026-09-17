import express, { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { adminLoginSchema, listAdminFeedbackQuerySchema } from '../middleware/schemas';
import { corsOrigins } from '../config/cors';
import { adminLogin, adminLogout, adminSession, listAdminFeedback, ADMIN_COOKIE_NAME, verifyAdminToken } from '../controllers/adminController';

const setAdminNoStore = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
};

const requireAdminCsrf = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }

    const origin = req.get('Origin');
    if (!origin || !corsOrigins.includes(origin) || req.get('X-KinMeet-Admin-Request') !== '1') {
        return res.status(403).json({ success: false, message: 'Invalid admin request origin' });
    }
    next();
};

const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[ADMIN_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    try {
        verifyAdminToken(token);
        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
};

export const createAdminRouter = () => {
    const router = express.Router();

    router.use(setAdminNoStore);
    router.use(requireAdminCsrf);

    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
        statusCode: 429,
        message: {
            success: false,
            message: 'Too many login attempts. Please try again later.',
        },
    });

    router.post('/login', loginLimiter, validate(adminLoginSchema), adminLogin);
    router.get('/session', authenticateAdmin, adminSession);
    router.post('/logout', adminLogout);
    router.get('/feedback', authenticateAdmin, validate(listAdminFeedbackQuerySchema, 'query'), listAdminFeedback);

    return router;
};
