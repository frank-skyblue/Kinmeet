import express from 'express';
import { login, logout, register } from '../controllers/authenticationController';
import { validate } from '../middleware/validate';
import { registerSchema } from '../middleware/schemas';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', validate(registerSchema), register);

export default router; 