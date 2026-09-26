import express, { Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { submitFeedbackSchema } from '../middleware/schemas';
import { handleImageUploadError, imageUpload } from '../middleware/upload';
import { submitFeedback } from '../controllers/feedbackController';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
    imageUpload.array('screenshots', 3)(req, res, (err: unknown) => handleImageUploadError(err, res, next));
}, validate(submitFeedbackSchema), submitFeedback);

export default router;
