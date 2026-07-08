import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { createNotification } from './notifications.service.js';

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError(400, "You can't follow yourself");
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new AppError(404, 'User not found');
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
    throw new AppError(409, 'Already following this user');
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
