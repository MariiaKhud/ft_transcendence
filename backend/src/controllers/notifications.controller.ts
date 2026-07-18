import { Request, Response } from 'express';
import * as notificationsService from '../services/notifications.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const unreadOnly = req.query.unread === 'true';
    const result = await notificationsService.getNotifications(req.user.userId, unreadOnly);
    res.status(200).json({ data: result, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}

export async function markOneAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const notification = await notificationsService.markOneAsRead(
      req.params.id,
      req.user.userId
    );

    res.status(200).json({ data: notification, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const result = await notificationsService.markAllAsRead(req.user.userId);
    res.status(200).json({ data: result, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}
