import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { getProfile, getUserProfile, updateProfile, deleteProfile } from '../controllers/profileController';

const router = express.Router();

// All profile routes require authentication
router.use(authenticateJWT);

router.get('/me', getProfile);
router.get('/:userId', getUserProfile);
router.put('/me', updateProfile);
router.delete('/me', deleteProfile);

export default router;

