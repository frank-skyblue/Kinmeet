import express from 'express';
import { authenticateJWT, authenticateWithoutUserRateLimit } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    registerNotificationDeviceSchema,
    unregisterNotificationDeviceSchema,
} from '../middleware/schemas';
import { registerDevice, unregisterDevice } from '../controllers/notificationsController';

const router = express.Router();

// Registered before the shared limiter. A valid user can delete their push
// subscription without spending or refilling the token bucket, including during logout.
router.delete(
    '/devices',
    authenticateWithoutUserRateLimit,
    validate(unregisterNotificationDeviceSchema),
    unregisterDevice,
);

router.use(authenticateJWT);

router.post('/devices', validate(registerNotificationDeviceSchema), registerDevice);

export default router;
