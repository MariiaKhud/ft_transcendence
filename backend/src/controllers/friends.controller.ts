import { Request, Response } from 'express';
import * as friendsService from '../services/friends.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function sendFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const requesterId = req.user.userId;
    const addresseeId = req.params.userId;

    const friendship = await friendsService.sendFriendRequest(requesterId, addresseeId);

    res.status(201).json({ data: friendship, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}

export async function respondToFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const addresseeId = req.user.userId;      // the person responding (must be addressee)
    const requesterId = req.params.userId;    // the person who sent the request
    const { action } = req.body;              // expect "ACCEPTED" or "DECLINED"

    if (action !== 'ACCEPTED' && action !== 'DECLINED') {
      return res.status(400).json({
        data: null,
        error: 'Action must be ACCEPTED or DECLINED',
      });
    }

    const friendship = await friendsService.respondToFriendRequest(
      requesterId,
      addresseeId,
      action
    );

    res.status(200).json({ data: friendship, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 400;
    res.status(status).json({ data: null, error: err.message });
  }
}

export async function getIncomingRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const requests = await friendsService.getIncomingRequests(req.user.userId);
    res.status(200).json({ data: requests, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}
