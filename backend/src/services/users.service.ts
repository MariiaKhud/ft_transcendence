import { prisma } from '../lib/prisma.js'

export async function setUserOnline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });
}

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
