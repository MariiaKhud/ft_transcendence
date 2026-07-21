import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  getNotifications,
  markOneAsRead,
  markAllAsRead }
from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', authMiddleware, getNotifications);
router.patch('/read-all', authMiddleware, markAllAsRead);
router.patch('/:id/read', authMiddleware, markOneAsRead);

export default router;
