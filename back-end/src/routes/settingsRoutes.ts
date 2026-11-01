import express from 'express';
import { authenticateJWT, authenticateJWTAllowDeactivated } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    changeEmailSchema,
    changeUsernameSchema,
    changePasswordSchema,
    deactivateAccountSchema,
} from '../middleware/schemas';
import {
    changeEmail,
    changeUsername,
    changePassword,
    deactivateAccount,
    reactivateAccount,
} from '../controllers/settingsController';

const router = express.Router();

// Registered before router.use(authenticateJWT): a deactivated account must reach this.
router.post('/account/reactivate', authenticateJWTAllowDeactivated, reactivateAccount);

router.use(authenticateJWT);

router.patch('/email', validate(changeEmailSchema), changeEmail);
router.patch('/username', validate(changeUsernameSchema), changeUsername);
router.patch('/password', validate(changePasswordSchema), changePassword);
router.post('/account/deactivate', validate(deactivateAccountSchema), deactivateAccount);

export default router;
