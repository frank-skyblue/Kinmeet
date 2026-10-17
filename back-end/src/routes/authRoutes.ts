import express from 'express';
import { checkEmail, checkUsername, login, logout, register } from '../controllers/authenticationController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { validate } from '../middleware/validate';
import { rateLimitPerUser } from '../middleware/rateLimit';
import { checkEmailSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, checkUsernameSchema } from '../middleware/schemas';

const router = express.Router();

router.post('/login', validate(loginSchema), login);
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

export default router; 