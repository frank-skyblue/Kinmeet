import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    changeEmailSchema,
    changeUsernameSchema,
    changePasswordSchema,
} from '../middleware/schemas';
import {
    changeEmail,
    changeUsername,
    changePassword,
} from '../controllers/settingsController';

const router = express.Router();

router.use(authenticateJWT);

router.patch('/email', validate(changeEmailSchema), changeEmail);
router.patch('/username', validate(changeUsernameSchema), changeUsername);
router.patch('/password', validate(changePasswordSchema), changePassword);

export default router;
