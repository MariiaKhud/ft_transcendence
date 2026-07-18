import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sendMessage, getConversation } from '../controllers/messages.controller.js';

const router = Router();

router.get('/:userId', authMiddleware, getConversation);
router.post('/:userId', authMiddleware, sendMessage);

export default router;
