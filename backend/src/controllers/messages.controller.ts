import { Request, Response } from 'express';
import * as messagesService from '../services/messages.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { ErrorCode } from '../lib/error-codes.js';

export async function sendMessage(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const senderId = req.user.userId;
    const receiverId = req.params.userId;
    const { content } = req.body;

    const message = await messagesService.sendMessage(senderId, receiverId, content);

    return sendSuccess(res, 201, message);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getConversation(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(
        res,
        new AppError(401, ErrorCode.AUTH_REQUIRED, 'Unauthorized')
      );
    }

    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;

    if (currentUserId === otherUserId) {
      return sendError(
        res,
        new AppError(400,
        ErrorCode.MESSAGE_SELF_FORBIDDEN,
        "You can't open a conversation with yourself"),
      );
    }

    const messages = await messagesService.getConversation(currentUserId, otherUserId);

    return sendSuccess(res, 200, messages);
  } catch (err) {
    return sendError(res, err);
  }
}
