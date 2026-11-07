import express, { Request, Response, NextFunction } from 'express';
import { authenticateJWT, authenticateJWTAllowDeactivated } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { rateLimitPerUser } from '../middleware/rateLimit';
import { updateProfileSchema, userIdParams } from '../middleware/schemas';
import { handleImageUploadError, imageUpload } from '../middleware/upload';
import { getProfile, getUserProfile, updateProfile, deleteProfile, uploadPhoto, deletePhoto } from '../controllers/profileController';

const router = express.Router();

// Registered before router.use(authenticateJWT): a deactivated account may still be deleted.
router.delete('/me', authenticateJWTAllowDeactivated, deleteProfile);

router.use(authenticateJWT);

router.get('/me', getProfile);
router.get('/:userId', validate(userIdParams, 'params'), getUserProfile);
// Changing country joins a new Discover group and alerts its members, so repeated changes are capped.
router.put(
    '/me',
    rateLimitPerUser({ windowMs: 60_000, max: 20, message: 'Too many profile updates, please wait a moment' }),
    validate(updateProfileSchema),
    updateProfile,
);

router.post('/photo', (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('photo')(req, res, (err: unknown) => handleImageUploadError(err, res, next));
}, uploadPhoto);

router.delete('/photo', deletePhoto);

export default router;
