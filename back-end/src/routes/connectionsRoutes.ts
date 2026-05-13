import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { requestIdParams, userIdParams } from '../middleware/schemas';
import {
    getConnectionRequests,
    acceptConnectionRequest,
    ignoreConnectionRequest,
    getConnections,
    removeConnection,
} from '../controllers/connectionsController';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getConnections);
router.get('/requests', getConnectionRequests);
router.post('/requests/:requestId/accept', validate(requestIdParams, 'params'), acceptConnectionRequest);
router.post('/requests/:requestId/ignore', validate(requestIdParams, 'params'), ignoreConnectionRequest);
router.delete('/:userId', validate(userIdParams, 'params'), removeConnection);

export default router;
