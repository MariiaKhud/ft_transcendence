import { prisma } from '../lib/prisma.js'
import { validateUuid } from '../lib/validation.js'

// Sets the user as online and updates their last seen timestamp.
export async function setUserOnline(userId: string) {
  validateUuid(userId, 'userId')

  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });
}

// Sets the user as offline and updates their last seen timestamp.
export async function getPublicProfileById(userId: string) {
  validateUuid(userId, 'userId')

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      isOnline: true,
      lastSeenAt: true,
      level: true,
      xp: true,
    },
  })
}
