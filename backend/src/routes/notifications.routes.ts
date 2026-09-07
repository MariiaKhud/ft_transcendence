import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  getNotifications,
  markOneAsRead,
  markAllAsRead }
from '../controllers/notifications.controller.js';
import { validateUuid } from '../lib/validation.js';

const router = Router();

router.param('id', (req, _res, next) => {
  try {
    validateUuid(req.params.id);
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/', authMiddleware, getNotifications);
router.patch('/read-all', authMiddleware, markAllAsRead);
router.patch('/:id/read', authMiddleware, markOneAsRead);

export default router;
