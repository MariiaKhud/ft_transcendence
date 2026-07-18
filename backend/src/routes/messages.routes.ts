import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sendMessage } from '../controllers/messages.controller.js';

const router = Router();

router.post('/:userId', authMiddleware, sendMessage);

export default router;
