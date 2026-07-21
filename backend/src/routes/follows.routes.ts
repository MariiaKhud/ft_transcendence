import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { followUser, unfollowUser } from '../controllers/follows.controller.js';

const router = Router();

router.post('/:userId', authMiddleware, followUser);
router.delete('/:userId', authMiddleware, unfollowUser);

export default router;
