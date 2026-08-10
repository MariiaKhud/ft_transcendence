import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../lib/error-codes.js';

const MAX_LENGTH = 2000;

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  // Can't message yourself
  if (senderId === receiverId) {
    throw new AppError(400, ErrorCode.MESSAGE_SELF_FORBIDDEN, "You can't send a message to yourself");
  }

  // Validate content exists and is a string
  if (!content || typeof content !== 'string') {
    throw new AppError(400, ErrorCode.VALIDATION_MESSAGE_CONTENT_REQUIRED, 'Message content is required');
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    throw new AppError(400, ErrorCode.VALIDATION_MESSAGE_CONTENT_EMPTY, 'Message cannot be empty');
  }

  if (trimmed.length > MAX_LENGTH) {
    throw new AppError(400, ErrorCode.VALIDATION_MESSAGE_CONTENT_MAX_LENGTH, `Message cannot exceed ${MAX_LENGTH} characters`);
  }

  // Check receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true },
  });

  if (!receiver) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content: trimmed,
    },
    // Return sender info so frontend can display it immediately
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return message;
}

export async function getConversation(currentUserId: string, otherUserId: string) {
  // Check the other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true },
  });

  if (!otherUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  // Fetch messages in both directions between the two users
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },  // asc = oldest first, natural chat order
  });

  // Mark messages sent TO current user as read
  // Only update if there are unread ones — avoids pointless DB write
  const hasUnread = messages.some(
    (m) => m.receiverId === currentUserId && !m.isRead
  );

  if (hasUnread) {
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reflect the read state in the response without a second DB fetch
    messages.forEach((m) => {
      if (m.receiverId === currentUserId) {
        m.isRead = true;
      }
    });
  }

  return messages;
}
