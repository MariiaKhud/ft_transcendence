import { prisma } from '../lib/prisma.js'
import { NotificationType } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../lib/error-codes.js';

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

  const notificationsWithUsers = await Promise.all(
    notifications.map(async (notification) => {
      if (!notification.refId) {
        return notification;
      }

      const actor = await prisma.user.findUnique({
        where: { id: notification.refId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      return {
        ...notification,
        actor,
      };
    })
  );

  return {
    notifications: notificationsWithUsers,
    unreadCount,
  };
}

export async function markOneAsRead(notificationId: string, userId: string) {
  // Check notification exists first
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(404, ErrorCode.NOTIFICATION_NOT_FOUND, 'Notification not found');
  }

  // Check ownership — must be your own notification
  if (notification.userId !== userId) {
    throw new AppError(403, ErrorCode.NOTIFICATION_MARK_READ_FORBIDDEN, 'You cannot mark another user\'s notification as read');
  }

  // If already read, just return it — no need to update or throw
  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
}
