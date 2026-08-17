import { Request, Response } from 'express';
import * as notificationsService from '../services/notifications.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { ErrorCode } from '../lib/error-codes.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const unreadOnly = req.query.unread === 'true';
    const result = await notificationsService.getNotifications(req.user.userId, unreadOnly);

    return sendSuccess(res, 200, result);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function markOneAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const notification = await notificationsService.markOneAsRead(
      req.params.id,
      req.user.userId
    );

    return sendSuccess(res, 200, notification);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const result = await notificationsService.markAllAsRead(req.user.userId);

    return sendSuccess(res, 200, result);
  } catch (err) {
    return sendError(res, err);
  }
}
