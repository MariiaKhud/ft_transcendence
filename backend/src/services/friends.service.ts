import { prisma } from '../lib/prisma.js'
import { createNotification } from './notifications.service';
import { AppError } from '../middleware/error.middleware.js';

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new AppError(400, "You can't friend yourself");
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') throw new AppError(409, 'Already friends');
    if (existing.status === 'PENDING') throw new AppError(409, 'Friend request already pending');
    if (existing.status === 'DECLINED') throw new AppError(409, 'Friend request was declined');
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId, status: 'PENDING' },
  });

  await createNotification(
    addresseeId,
    'FRIEND_REQUEST',
    'sent you a friend request',
    requesterId);

  return friendship;
}

export async function respondToFriendRequest(
  requesterId: string,
  addresseeId: string,
  action: 'ACCEPTED' | 'DECLINED'
) {
  // 403 — user is trying to respond to their own sent request
  if (requesterId === addresseeId) {
    throw new AppError(403, 'You cannot respond to your own friend request');
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      requesterId,
      addresseeId,
      status: 'PENDING',
    },
  });

  // 404 — request doesn't exist at all, or already resolved
  if (!friendship) {
    const exists = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (!exists) {
      throw new AppError(404, 'Friend request not found');
    }

    // Row exists but not PENDING — so it's already been responded to
    // Also covers the case where User A tries to accept User B's request
    // using User A's own cookie (wrong role — addressee mismatch)
    throw new AppError(403, 'You are not the addressee of this request');
  }

  const updated = await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: action },
  });

  // Only notify on accept — no notification for decline (don't tell someone they were rejected)
  if (action === 'ACCEPTED') {
    await createNotification(
      requesterId,                          // notify the person who sent the request
      'FRIEND_ACCEPTED',
      'accepted your friend request',
      addresseeId                           // refId = who accepted, for building a profile link
    );
  }

  return updated;
}
