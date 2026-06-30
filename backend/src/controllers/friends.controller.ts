import { Request, Response } from 'express';
import * as friendsService from '../services/friends.service.js';

export async function sendFriendRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
        return res.status(401).json({ data: null, error: 'Unauthorized'});
    }

    const requesterId = req.user.userId;
    const addresseeId = req.params.userId;

    if (requesterId === addresseeId) {
      return res.status(400).json({ 
        data: null,
        error: "You can't friend yourself"
        });
    }

    const friendship = await friendsService.sendFriendRequest(
        requesterId,
        addresseeId
    );

    res.status(201).json({ data: friendship, error: null });
  } catch (err: any) {
    res.status(400).json({ data: null, error: err.message });
  }
}