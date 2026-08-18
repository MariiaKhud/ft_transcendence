import { Request, Response } from 'express';
import * as usersService from '../services/users.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { ErrorCode } from '../lib/error-codes.js';

export async function updateOnlineStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    await usersService.setUserOnline(req.user.userId);

    return sendSuccess(res, 200, { isOnline: true, });
  } catch (err) {
    return sendError(res, err);
  }
}
