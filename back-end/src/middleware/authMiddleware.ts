import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { isAccountDeactivated } from '../models/User';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';

export interface JwtPayload {
    id: string;
    email: string;
    firstName: string;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

// A deactivated account may only reactivate, sign out, or delete itself; every other
// authenticated route rejects it with ACCOUNT_DEACTIVATED.
const createAuthenticateJWT = ({ allowDeactivated }: { allowDeactivated: boolean }) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        if (!allowDeactivated) {
            try {
                if (await isAccountDeactivated(decoded.id)) {
                    return res.status(403).json({
                        success: false,
                        code: ACCOUNT_DEACTIVATED_CODE,
                        message: 'Your account is deactivated',
                    });
                }
            } catch (err) {
                return next(err);
            }
        }

        req.user = decoded;
        next();
    };

export const authenticateJWT = createAuthenticateJWT({ allowDeactivated: false });

export const authenticateJWTAllowDeactivated = createAuthenticateJWT({ allowDeactivated: true });

// Alias for backward compatibility
export const authenticateToken = authenticateJWT;
