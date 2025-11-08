import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import {
    getConnectionRequests,
    acceptConnectionRequest,
    ignoreConnectionRequest,
    getConnections
} from '../controllers/connectionsController';

const router = express.Router();

// All connection routes require authentication
router.use(authenticateJWT);

router.get('/', getConnections);
router.get('/requests', getConnectionRequests);
router.post('/requests/:requestId/accept', acceptConnectionRequest);
router.post('/requests/:requestId/ignore', ignoreConnectionRequest);

export default router;

