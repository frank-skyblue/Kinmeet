import express, { Request, Response, NextFunction } from 'express';
import { authenticateJWT, authenticateJWTAllowDeactivated } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { updateProfileSchema, userIdParams } from '../middleware/schemas';
import { handleImageUploadError, imageUpload } from '../middleware/upload';
import { getProfile, getUserProfile, updateProfile, deleteProfile, uploadPhoto, deletePhoto } from '../controllers/profileController';

const router = express.Router();

// Registered before router.use(authenticateJWT): a deactivated account may still be deleted.
router.delete('/me', authenticateJWTAllowDeactivated, deleteProfile);

router.use(authenticateJWT);

router.get('/me', getProfile);
router.get('/:userId', validate(userIdParams, 'params'), getUserProfile);
router.put('/me', validate(updateProfileSchema), updateProfile);

router.post('/photo', (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('photo')(req, res, (err: unknown) => handleImageUploadError(err, res, next));
}, uploadPhoto);

router.delete('/photo', deletePhoto);

export default router;
