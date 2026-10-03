import express, { Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { submitSupportRequestSchema } from '../middleware/schemas';
import { handleImageUploadError, imageUpload } from '../middleware/upload';
import { submitSupportRequest } from '../controllers/supportController';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
    imageUpload.array('screenshots', 3)(req, res, (err: unknown) => handleImageUploadError(err, res, next));
}, validate(submitSupportRequestSchema), submitSupportRequest);

export default router;
