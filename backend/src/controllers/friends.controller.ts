import { Request, Response } from 'express';
import * as friendsService from '../services/friends.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js'
import { ErrorCode } from '../lib/error-codes.js';

export async function sendFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const requesterId = req.user.userId;
    const addresseeId = req.params.userId;

    const friendship = await friendsService.sendFriendRequest(requesterId, addresseeId);

    return sendSuccess(res, 201, friendship);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function respondToFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const addresseeId = req.user.userId;
    const requesterId = req.params.userId;
    const { action } = req.body;

    if (action !== 'ACCEPTED' && action !== 'DECLINED') {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_FRIEND_ACTION_INVALID,
        'Action must be ACCEPTED or DECLINED'
      );
    }

    const friendship = await friendsService.respondToFriendRequest(
      requesterId,
      addresseeId,
      action
    );

    return sendSuccess(res, 200, friendship);
  } catch (err) {
    return sendError(res, err, 400);
  }
}

export async function getIncomingRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const requests = await friendsService.getIncomingRequests(req.user.userId);

    return sendSuccess(res, 200, requests);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFriends(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const friends = await friendsService.getFriends(req.user.userId);

    return sendSuccess(res, 200, friends);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function removeFriend(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const currentUserId = req.user.userId;
    const friendId = req.params.userId;

    await friendsService.removeFriend(currentUserId, friendId);

    return sendSuccess(res, 200, { message: 'Friend removed', });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function cancelFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    await friendsService.cancelFriendRequest(req.user.userId, req.params.userId);

    return sendSuccess(res, 200, { message: 'Friend request cancelled', });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFriendshipStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, new Error('Unauthorized'), 401);
    }

    const status = await friendsService.getFriendshipStatus(
      req.user.userId,
      req.params.userId
    );

    return sendSuccess(res, 200, status);
  } catch (err) {
    return sendError(res, err);
  }
}
