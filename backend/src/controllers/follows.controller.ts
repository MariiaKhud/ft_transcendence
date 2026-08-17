import { Request, Response } from 'express';
import * as followsService from '../services/follows.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { ErrorCode } from '../lib/error-codes.js'

export async function followUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const followerId = req.user.userId;
    const followingId = req.params.userId;

    const follow = await followsService.followUser(followerId, followingId);

    return sendSuccess(res, 201, follow);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const followerId = req.user.userId;
    const followingId = req.params.userId;

    await followsService.unfollowUser(followerId, followingId);

    return sendSuccess(res, 200, { message: 'Unfollowed successfully', });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFollowStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const isFollowing = await followsService.getFollowStatus(
      req.user.userId,
      req.params.userId
    );

    return sendSuccess(res, 200, { isFollowing, });
  } catch (err) {
    return sendError(res, err);
  }
}
