import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { userIdParams } from '../middleware/schemas';
import { getProfile, getUserProfile, updateProfile, deleteProfile, uploadPhoto, deletePhoto, avatarUpload } from '../controllers/profileController';

const router = express.Router();

router.use(authenticateJWT);

router.get('/me', getProfile);
router.get('/:userId', validate(userIdParams, 'params'), getUserProfile);
router.put('/me', updateProfile);
router.delete('/me', deleteProfile);

router.post('/photo', (req: Request, res: Response, next: NextFunction) => {
    avatarUpload.single('photo')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Image must be under 5 MB' });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err instanceof Error) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, uploadPhoto);

router.delete('/photo', deletePhoto);

export default router;
