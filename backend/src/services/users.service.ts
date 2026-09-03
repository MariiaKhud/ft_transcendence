import { prisma } from '../lib/prisma.js'

// Sets the user as online and updates their last seen timestamp.
export async function setUserOnline(userId: string) {
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
