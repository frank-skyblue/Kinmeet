import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { submitFeedbackSchema } from '../middleware/schemas';
import { submitFeedback, feedbackUpload } from '../controllers/feedbackController';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
    feedbackUpload.array('screenshots', 3)(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Image must be under 5 MB' });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ success: false, message: 'Up to 3 screenshots are allowed' });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err instanceof Error) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, validate(submitFeedbackSchema), submitFeedback);

export default router;
