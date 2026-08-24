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


export async function getUserById(req: Request, res: Response) {
  try {
    const user = await usersService.getPublicProfileById(req.params.userId)

    if (!user) return res.status(404).json({ data: null, error: 'User not found' })

    res.status(200).json({ data: user, error: null })
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message })
  }
}
