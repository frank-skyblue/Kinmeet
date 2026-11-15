import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { checkEmail, checkUsername, login, logout, register } from '../controllers/authenticationController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { getLoginIpLimitConfig } from '../config/env';
import { validate } from '../middleware/validate';
import { rateLimitPerUser } from '../middleware/rateLimit';
import { checkEmailSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, checkUsernameSchema } from '../middleware/schemas';

const SIGN_IN_IP_LIMIT_MESSAGE = 'Too many sign-in attempts from this network. Try again later.';

// A new router owns a new in-memory limiter. The quota is per Node process, not global.
export const createAuthRouter = () => {
    const router = express.Router();
    const { maxAttempts, windowMs } = getLoginIpLimitConfig();
    const loginIpLimiter = rateLimit({
        windowMs,
        limit: maxAttempts,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
        statusCode: 429,
        message: {
            success: false,
            message: SIGN_IN_IP_LIMIT_MESSAGE,
        },
    });

    router.post('/login', validate(loginSchema), loginIpLimiter, login);
    router.post('/logout', logout);
    router.post('/check-email', validate(checkEmailSchema), checkEmail);
    // Public (used during sign-up), so limited per IP to stop it being used to sweep through names.
    router.post(
        '/check-username',
        rateLimitPerUser({ windowMs: 60_000, max: 60, message: 'Too many checks, please wait a moment' }),
        validate(checkUsernameSchema),
        checkUsername,
    );
    router.post('/register', validate(registerSchema), register);
    router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
    router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

    return router;
};
