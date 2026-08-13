import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../lib/error-codes.js';
import { createNotification } from './notifications.service.js';

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError(400, ErrorCode.FOLLOW_SELF_FORBIDDEN, "You can't follow yourself");
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  // Check not already following
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {  // Prisma generates this name from @@unique([followerId, followingId])
        followerId,
        followingId,
      },
    },
  });

  if (existing) {
    throw new AppError(409, ErrorCode.FOLLOW_ALREADY, 'Already following this user');
  }

  const follow = await prisma.follow.create({
    data: { followerId, followingId },
  });

  await createNotification(
    followingId,       // notify the person being followed
    'FOLLOWED',
    'started following you',
    followerId         // refId = who followed, for building a profile link
  );

  return follow;
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError(400, ErrorCode.FOLLOW_UNFOLLOW_SELF_FORBIDDEN, "You can't unfollow yourself");
  }

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (!follow) {
    throw new AppError(404, ErrorCode.FOLLOW_NOT_FOLLOWING, 'You are not following this user');
  }

  await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });
}

export async function getFollowStatus(
  followerId: string,
  followingId: string
): Promise<boolean> {
  if (followerId === followingId) return false;

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });

  return !!follow;
}
