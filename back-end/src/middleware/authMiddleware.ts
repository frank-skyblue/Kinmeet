import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { applyUserRateLimit } from './rateLimitMiddleware';

export interface JwtPayload {
    id: string;
    email: string;
    firstName: string;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

const rejectUnauthenticated = (res: Response, message: string): void => {
    res.status(401).json({ success: false, message });
};

// Verifies the bearer token and stores req.user. Sends 401 and returns undefined
// when the caller is not authenticated. Does not spend a rate-limit token.
const authenticatedUserId = (req: AuthRequest, res: Response): string | undefined => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        rejectUnauthenticated(res, 'No token provided');
        return undefined;
    }

    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        rejectUnauthenticated(res, 'Invalid token');
        return undefined;
    }

    if (typeof decoded?.id !== 'string' || decoded.id.length === 0) {
        rejectUnauthenticated(res, 'Invalid token');
        return undefined;
    }

    req.user = decoded;
    return decoded.id;
};

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = authenticatedUserId(req, res);
    if (!userId) {
        return;
    }
    if (!applyUserRateLimit(res, userId)) {
        return;
    }
    next();
};

// Same JWT checks as authenticateJWT, then continues without spending a token.
// Used only by push-device unregister so logout can delete the subscription
// after the user's bucket is empty.
export const authenticateWithoutUserRateLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = authenticatedUserId(req, res);
    if (!userId) {
        return;
    }
    next();
};

// Alias for backward compatibility
export const authenticateToken = authenticateJWT; 