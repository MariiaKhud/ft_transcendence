import { prisma } from '../lib/prisma.js'
import { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  refId?: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
      refId: refId ?? null,
    },
  });
}

export async function getNotifications(userId: string, unreadOnly: boolean) {
  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}
