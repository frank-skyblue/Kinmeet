import express from 'express';
import { checkEmail, login, logout, register } from '../controllers/authenticationController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { validate } from '../middleware/validate';
import { checkEmailSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../middleware/schemas';

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/check-email', validate(checkEmailSchema), checkEmail);
router.post('/register', validate(registerSchema), register);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router; 