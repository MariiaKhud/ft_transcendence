import { Request, Response } from 'express';
import * as usersService from '../services/users.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../lib/error-codes.js';

export async function updateOnlineStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, code: ErrorCode.AUTH_REQUIRED, error: 'Unauthorized' });
    }

    await usersService.setUserOnline(req.user.userId);
    res.status(200).json({ data: { isOnline: true }, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.code : ErrorCode.INTERNAL_SERVER_ERROR;
    res.status(status).json({ data: null, code, error: err.message });
  }
}
