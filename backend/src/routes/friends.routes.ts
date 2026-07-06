import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  sendFriendRequest,
  respondToFriendRequest,
  getIncomingRequests,
  getFriends,
  removeFriend,
} from '../controllers/friends.controller.js';

const router = Router();
router.get('/requests', authMiddleware, getIncomingRequests); // must stay above /:userId
router.get('/', authMiddleware, getFriends);
router.post('/request/:userId', authMiddleware, sendFriendRequest);
router.patch('/request/:userId', authMiddleware, respondToFriendRequest);
router.delete('/:userId', authMiddleware, removeFriend);

export default router;