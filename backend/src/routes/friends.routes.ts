import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  sendFriendRequest,
  respondToFriendRequest,
  getIncomingRequests,
  getFriends,
  removeFriend,
  cancelFriendRequest,
  getFriendshipStatus,
} from '../controllers/friends.controller.js';
import { validateUuid } from '../lib/validation.js';

const router = Router();
router.param('userId', (req, _res, next) => {
  try {
    validateUuid(req.params.userId, 'userId');
    next();
  } catch (error) {
    next(error);
  }
});
router.get('/requests', authMiddleware, getIncomingRequests); // must stay above /:userId
router.get('/', authMiddleware, getFriends);
router.get('/status/:userId', authMiddleware, getFriendshipStatus);
router.post('/request/:userId', authMiddleware, sendFriendRequest);
router.patch('/request/:userId', authMiddleware, respondToFriendRequest);
router.delete('/request/:userId', authMiddleware, cancelFriendRequest);
router.delete('/:userId', authMiddleware, removeFriend);

export default router;