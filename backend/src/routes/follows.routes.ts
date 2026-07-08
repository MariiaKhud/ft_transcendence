import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { followUser } from '../controllers/follows.controller.js';

const router = Router();

router.post('/:userId', authMiddleware, followUser);

export default router;
