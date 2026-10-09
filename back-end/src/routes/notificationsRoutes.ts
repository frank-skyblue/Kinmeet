import express from 'express';
import { authenticateJWT, authenticateJWTAllowDeactivated } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    registerNotificationDeviceSchema,
    unregisterNotificationDeviceSchema,
} from '../middleware/schemas';
import { registerDevice, unregisterDevice } from '../controllers/notificationsController';

const router = express.Router();

// Registered before router.use(authenticateJWT): signing out of a deactivated account
// still removes this device's push subscription.
router.delete(
    '/devices',
    authenticateJWTAllowDeactivated,
    validate(unregisterNotificationDeviceSchema),
    unregisterDevice,
);

router.use(authenticateJWT);

router.post('/devices', validate(registerNotificationDeviceSchema), registerDevice);

export default router;
