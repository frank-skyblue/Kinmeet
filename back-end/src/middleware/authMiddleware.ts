import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { User, type AccountStatus } from '../models/User';
import { applyUserRateLimit } from './rateLimitMiddleware';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
export const INVALID_TOKEN_CODE = 'INVALID_TOKEN';

export interface JwtPayload {
    id: string;
    email: string;
    firstName: string;
    tv?: number;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export type AuthTokenCheck =
    | { valid: true; payload: JwtPayload; accountStatus: AccountStatus }
    // revokedAccountStatus is set when the token was genuine but has been revoked,
    // so callers can tell "your account was deactivated" apart from a bad token.
    | { valid: false; revokedAccountStatus?: AccountStatus };

/**
 * Verifies the signature, then that the token has not been revoked: its `tv` must
 * match the user's current tokenVersion. Invalid, revoked, and orphaned (account
 * deleted) tokens are not valid. Database errors are thrown.
 */
export const verifyAuthToken = async (token: string): Promise<AuthTokenCheck> => {
    let payload: JwtPayload;
    try {
        payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return { valid: false };
    }

    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
        return { valid: false };
    }

    const account = await User.findById(payload.id).select('+tokenVersion accountStatus').lean();
    if (!account) return { valid: false };

    const accountStatus = account.accountStatus ?? 'active';
    // Tokens issued before tokenVersion existed have no tv and match the default of 0.
    if ((payload.tv ?? 0) !== (account.tokenVersion ?? 0)) {
        return { valid: false, revokedAccountStatus: accountStatus };
    }

    return { valid: true, payload, accountStatus };
};

// A deactivated account may only reactivate, sign out, or delete itself; every other
// authenticated route rejects it with ACCOUNT_DEACTIVATED. The shared user token bucket
// runs only after those checks. skipUserRateLimit is only for push-device unregister.
const createAuthenticateJWT = ({
    allowDeactivated,
    skipUserRateLimit = false,
}: {
    allowDeactivated: boolean;
    skipUserRateLimit?: boolean;
}) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];

        let verified: AuthTokenCheck;
        try {
            verified = await verifyAuthToken(token);
        } catch (err) {
            return next(err);
        }

        if (!verified.valid) {
            // The session ended because the account was deactivated (possibly on another
            // device): 401 because this token is dead, but with ACCOUNT_DEACTIVATED so the
            // client can offer reactivation after the user signs in again.
            if (verified.revokedAccountStatus === 'deactivated') {
                return res.status(401).json({
                    success: false,
                    code: ACCOUNT_DEACTIVATED_CODE,
                    message: 'Your account is deactivated',
                });
            }
            return res.status(401).json({
                success: false,
                code: INVALID_TOKEN_CODE,
                message: 'Invalid token',
            });
        }

        if (verified.accountStatus === 'deactivated' && !allowDeactivated) {
            return res.status(403).json({
                success: false,
                code: ACCOUNT_DEACTIVATED_CODE,
                message: 'Your account is deactivated',
            });
        }

        req.user = verified.payload;
        if (skipUserRateLimit) {
            return next();
        }

        try {
            const allowed = applyUserRateLimit(res, verified.payload.id);
            if (!allowed) {
                return;
            }
        } catch (err) {
            return next(err);
        }
        next();
    };

export const authenticateJWT = createAuthenticateJWT({ allowDeactivated: false });

export const authenticateJWTAllowDeactivated = createAuthenticateJWT({ allowDeactivated: true });

// Logout of a deactivated account must still delete this device's push subscription,
// and that delete does not spend the shared user token bucket.
export const authenticateJWTAllowDeactivatedWithoutUserRateLimit = createAuthenticateJWT({
    allowDeactivated: true,
    skipUserRateLimit: true,
});

// Alias for backward compatibility
export const authenticateToken = authenticateJWT;
