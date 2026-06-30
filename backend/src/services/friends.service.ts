import { prisma } from '../lib/prisma.js'
import { createNotification } from './notifications.service';

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  // Check both directions — a friendship row could exist either way
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') throw new Error('Already friends');
    if (existing.status === 'PENDING') throw new Error('Friend request already pending');
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId, status: 'PENDING' },
  });

  await createNotification(addresseeId, 'FRIEND_REQUEST', 'sent you a friend request', requesterId);

  return friendship;
}