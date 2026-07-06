import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { sendFriendRequest, respondToFriendRequest, getIncomingRequests } from '../controllers/friends.controller.js';


const router = Router();
router.post('/request/:userId', authMiddleware, sendFriendRequest);
router.patch('/request/:userId', authMiddleware, respondToFriendRequest);
router.get('/requests', authMiddleware, getIncomingRequests);

export default router;