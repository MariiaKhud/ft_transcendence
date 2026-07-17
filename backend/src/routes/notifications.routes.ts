import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getNotifications } from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', authMiddleware, getNotifications);

export default router;
