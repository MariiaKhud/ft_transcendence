import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { followUser, unfollowUser, getFollowStatus } from '../controllers/follows.controller.js';

const router = Router();

router.get('/status/:userId', authMiddleware, getFollowStatus);
router.post('/:userId', authMiddleware, followUser);
router.delete('/:userId', authMiddleware, unfollowUser);

export default router;
