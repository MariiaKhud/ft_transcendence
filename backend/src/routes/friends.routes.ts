import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { sendFriendRequest } from '../controllers/friends.controller';

const router = Router();
router.post('/request/:userId', authMiddleware, sendFriendRequest);

export default router;