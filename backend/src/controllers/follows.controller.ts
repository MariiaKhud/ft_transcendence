import { Request, Response } from 'express';
import * as followsService from '../services/follows.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function followUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const followerId = req.user.userId;
    const followingId = req.params.userId;

    const follow = await followsService.followUser(followerId, followingId);
    res.status(201).json({ data: follow, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ data: null, error: 'Unauthorized' });
    }

    const followerId = req.user.userId;
    const followingId = req.params.userId;

    await followsService.unfollowUser(followerId, followingId);
    res.status(200).json({ data: { message: 'Unfollowed successfully' }, error: null });
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).json({ data: null, error: err.message });
  }
}
