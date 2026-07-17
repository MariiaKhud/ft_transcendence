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
