import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { getMatches, sendMeetRequest, passUser } from '../controllers/matchingController';

const router = express.Router();

// All matching routes require authentication
router.use(authenticateJWT);

router.get('/', getMatches);
router.post('/meet', sendMeetRequest);
router.post('/pass', passUser);

export default router;

