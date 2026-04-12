import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
    registerNotificationDeviceSchema,
    unregisterNotificationDeviceSchema,
} from '../middleware/schemas';
import { registerDevice, unregisterDevice } from '../controllers/notificationsController';

const router = express.Router();

router.use(authenticateJWT);

router.post('/devices', validate(registerNotificationDeviceSchema), registerDevice);
router.delete('/devices', validate(unregisterNotificationDeviceSchema), unregisterDevice);

export default router;
