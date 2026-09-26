import crypto from 'crypto';
import jwt, { Jwt, JwtPayload } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import {
    ADMIN_COOKIE_SAME_SITE,
    ADMIN_PASS_KEY,
    JWT_SECRET,
    NODE_ENV,
    type AdminCookieSameSite,
    type NodeEnv,
} from '../config/env';
import { AppError } from '../middleware/errorHandler';

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

export const buildAdminCookieOptions = (
    sameSite: AdminCookieSameSite = ADMIN_COOKIE_SAME_SITE,
    nodeEnv: NodeEnv = NODE_ENV,
): CookieOptions => ({
    httpOnly: true,
    path: ADMIN_COOKIE_PATH,
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    sameSite,
    secure: sameSite === 'none' || nodeEnv === 'production',
});

export const getAdminClearCookieOptions = (): CookieOptions => {
    const { httpOnly, path, sameSite, secure } = buildAdminCookieOptions();
    return { httpOnly, path, sameSite, secure };
};

export const issueAdminToken = (password: string): string => {
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
