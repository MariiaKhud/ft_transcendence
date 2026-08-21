import { prisma } from '../lib/prisma.js'
import { createNotification } from './notifications.service';
import { AppError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../lib/error-codes.js';
import type { FriendshipState } from '../../../shared/types/friendship.js';

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
) {
  if (requesterId === addresseeId) {
    throw new AppError(
      400,
      ErrorCode.FRIEND_SELF_FORBIDDEN,
      "You can't friend yourself");
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
    if (existing.status === 'ACCEPTED') {
      throw new AppError(
        409,
        ErrorCode.FRIEND_ALREADY,
        'Already friends'
      );
    }

    if (existing.status === 'PENDING') {
      throw new AppError(
        409,
        ErrorCode.FRIEND_REQUEST_ALREADY_PENDING,
        'Friend request already pending'
      );
    }
    
    if (existing.status === 'DECLINED') {
      const friendship = await prisma.friendship.update({
        where: {
          id: existing.id,
        },
        data: {
          requesterId,
          addresseeId,
          status: 'PENDING',
        },
      });

      await createNotification(
        addresseeId,
        'FRIEND_REQUEST',
        'sent you a friend request',
        requesterId
      );

      return friendship;
    }
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId,
      addresseeId,
      status: 'PENDING'
    },
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
    throw new AppError(
      403,
      ErrorCode.FRIEND_RESPOND_SELF_FORBIDDEN,
      'You cannot respond to your own friend request'
    );
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
      throw new AppError(
        404,
        ErrorCode.FRIEND_REQUEST_NOT_FOUND,
        'Friend request not found'
      );
    }

    if (exists.status === 'ACCEPTED') {
      throw new AppError(
        409,
        ErrorCode.FRIEND_ALREADY,
        'Already friends'
      );
    }

    if (exists.status === 'DECLINED') {
      throw new AppError(
        409,
        ErrorCode.FRIEND_ALREADY,
        'Already declined'
      );
    }

    throw new AppError(
      403,
      ErrorCode.FRIEND_NOT_ADDRESSEE,
      'You are not the addressee of this request'
    );
  }

  const updated = await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: action },
  });

  const requestNotification = await prisma.notification.findFirst({
    where: {
      userId: addresseeId,
      type: 'FRIEND_REQUEST',
      refId: requesterId,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (requestNotification) {
    await prisma.notification.update({
      where: { id: requestNotification.id },
      data: {
        type: action === 'ACCEPTED' ? 'FRIEND_ACCEPTED' : 'FRIEND_REQUEST',
        message: action === 'ACCEPTED' ? 'is now your friend' : 'friend request declined',
      },
    });
  }

  if (action === 'ACCEPTED') {
    await createNotification(
      requesterId,
      'FRIEND_ACCEPTED',
      'accepted your friend request',
      addresseeId
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
    throw new AppError(
      400,
      ErrorCode.FRIEND_REMOVE_SELF_FORBIDDEN,
      "You can't remove yourself"
    );
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
    throw new AppError(
      404,
      ErrorCode.FRIENDSHIP_NOT_FOUND,
      'Friendship not found'
    );
  }

  await prisma.friendship.delete({
    where: { id: friendship.id },
  });
}

export async function cancelFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new AppError(
      400,
      ErrorCode.FRIEND_CANCEL_SELF_FORBIDDEN,
      "You can't cancel a request to yourself"
    );
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      requesterId,
      addresseeId,
      status: 'PENDING',
    },
  });

  if (!friendship) {
    throw new AppError(
      404,
      ErrorCode.FRIEND_REQUEST_NOT_FOUND,
      'Pending friend request not found'
    );
  }

  // Remove the pending friendship
  await prisma.friendship.delete({
    where: { id: friendship.id },
  });

  // Remove the notification so addressee doesn't see a dangling request
  const requestNotification = await prisma.notification.findFirst({
    where: {
      userId: addresseeId,
      type: 'FRIEND_REQUEST',
      refId: requesterId,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (requestNotification) {
    await prisma.notification.delete({
      where: { id: requestNotification.id },
    });
  }
}

export async function getFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ state: FriendshipState }> {
  if (currentUserId === targetUserId) {
    return { state: 'self' };  // profile page uses this to hide the button entirely
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: currentUserId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: currentUserId },
      ],
    },
  });

  if (!friendship) return { state: 'none' };
  if (friendship.status === 'ACCEPTED') return { state: 'friends' };
  if (friendship.status === 'DECLINED') return { state: 'none' };
  if (friendship.requesterId === currentUserId) return { state: 'pending_sent' };
  return { state: 'pending_received' };
}
