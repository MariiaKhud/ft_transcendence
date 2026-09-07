import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sendMessage, getConversation } from '../controllers/messages.controller.js';
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

router.get('/:userId', authMiddleware, getConversation);
router.post('/:userId', authMiddleware, sendMessage);

export default router;
