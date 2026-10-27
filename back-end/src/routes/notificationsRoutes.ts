import express from 'express';
import { authenticateJWT, authenticateJWTAllowDeactivated } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    registerNotificationDeviceSchema,
    unregisterNotificationDeviceSchema,
    updateNotificationPreferencesSchema,
} from '../middleware/schemas';
import {
    getPreferences,
    registerDevice,
    unregisterDevice,
    updatePreferences,
} from '../controllers/notificationsController';

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

router.get('/preferences', getPreferences);
router.patch('/preferences', validate(updateNotificationPreferencesSchema), updatePreferences);
export default router;
