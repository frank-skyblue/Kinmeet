import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { rateLimitPerUser } from '../middleware/rateLimit';
import { passUserSchema, sendMeetRequestSchema } from '../middleware/schemas';
import { getMatches, sendMeetRequest, passUser } from '../controllers/matchingController';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getMatches);
router.post('/meet', validate(sendMeetRequestSchema), sendMeetRequest);
router.post(
    '/pass',
    rateLimitPerUser({ windowMs: 60_000, max: 120, message: 'Too many passes, please wait a moment' }),
    validate(passUserSchema),
    passUser,
);

export default router;
