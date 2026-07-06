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

export async function getIncomingRequests(addresseeId: string) {
  const requests = await prisma.friendship.findMany({
    where: {
      addresseeId,
      status: 'PENDING',
    },
    include: {
      requester: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return requests;
}

export async function getFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
    },
    include: {
      requester: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isOnline: true,
          lastSeenAt: true,
        },
      },
      addressee: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isOnline: true,
          lastSeenAt: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // For each friendship, return the person who is NOT the current user
  return friendships.map((f) => {
    const friend = f.requesterId === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      since: f.updatedAt,  // updatedAt = when status changed to ACCEPTED
      ...friend,
    };
  });
}

export async function removeFriend(currentUserId: string, friendId: string) {
  if (currentUserId === friendId) {
    throw new AppError(400, "You can't remove yourself");
  }

  // Find in both directions — either user could have been the original requester
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: currentUserId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: currentUserId },
      ],
    },
  });

  if (!friendship) {
    throw new AppError(404, 'Friendship not found');
  }

  await prisma.friendship.delete({
    where: { id: friendship.id },
  });
}

export async function cancelFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new AppError(400, "You can't cancel a request to yourself");
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      requesterId,   // only the original sender can cancel — no OR here
      addresseeId,
      status: 'PENDING',
    },
  });

  if (!friendship) {
    throw new AppError(404, 'Pending friend request not found');
  }

  await prisma.friendship.delete({
    where: { id: friendship.id },
  });
}
