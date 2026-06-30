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