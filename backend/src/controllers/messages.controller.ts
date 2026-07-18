import { Request, Response } from 'express';
import * as messagesService from '../services/messages.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function sendMessage(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const senderId = req.user.userId;
    const receiverId = req.params.userId;
    const { content } = req.body;

    const message = await messagesService.sendMessage(senderId, receiverId, content);
    res.status(201).json({ data: message, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}
