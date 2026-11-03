import express from 'express';
import {
    authenticateJWT,
    authenticateJWTAllowDeactivatedWithoutUserRateLimit,
} from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    registerNotificationDeviceSchema,
    unregisterNotificationDeviceSchema,
} from '../middleware/schemas';
import { registerDevice, unregisterDevice } from '../controllers/notificationsController';

const router = express.Router();

// Before the shared limiter: a deactivated account can still remove this device's
// push subscription, and the delete does not spend the user's token bucket.
router.delete(
    '/devices',
    authenticateJWTAllowDeactivatedWithoutUserRateLimit,
    validate(unregisterNotificationDeviceSchema),
    unregisterDevice,
);

router.use(authenticateJWT);

router.post('/devices', validate(registerNotificationDeviceSchema), registerDevice);

export default router;
