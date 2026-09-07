import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { followUser, unfollowUser, getFollowStatus } from '../controllers/follows.controller.js';
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

router.get('/status/:userId', authMiddleware, getFollowStatus);
router.post('/:userId', authMiddleware, followUser);
router.delete('/:userId', authMiddleware, unfollowUser);

export default router;
