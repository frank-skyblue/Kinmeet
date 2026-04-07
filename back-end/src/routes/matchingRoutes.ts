import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { sendMeetRequestSchema } from '../middleware/schemas';
import { getMatches, sendMeetRequest, passUser } from '../controllers/matchingController';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getMatches);
router.post('/meet', validate(sendMeetRequestSchema), sendMeetRequest);
router.post('/pass', passUser);

export default router;
