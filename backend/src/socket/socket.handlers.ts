import type { Server, Socket } from 'socket.io'
import { prisma } from '../lib/prisma.js'
import { createNotification } from '../services/notifications.service.js'
import { ErrorCode } from '../lib/error-codes.js'
import { AppError } from '../middleware/error.middleware.js'
import { validateUuid } from '../lib/validation.js'

function validateChatUserId(socket: Socket, value: unknown, fieldName: string) {
  try {
    if (typeof value !== 'string') {
      throw new AppError(400, ErrorCode.VALIDATION_INVALID_UUID, `Validation failed: ${fieldName} must be a valid UUID`)
    }

    validateUuid(value, fieldName)
    return true
  } catch (error) {
    if (error instanceof AppError) {
      socket.emit('chat:error', { code: error.code, message: error.message })
    }
    return false
  }
}

export function registerChatHandlers(io: Server, socket: Socket) {
  const senderId = socket.data.userId as string

  socket.on('presence:heartbeat', async () => {
    try {
      await prisma.user.updateMany({
        where: { id: senderId, isOnline: true },
        data: { lastSeenAt: new Date() },
      })
    } catch (err) {
      console.error('Presence heartbeat failed:', err)
    }
  })

  // ── chat:send ────────────────────────────────────────────────
  // Client emits this when user sends a message
  socket.on('chat:send', async (payload: { receiverId: string; content: string }) => {
    const { receiverId, content } = payload

    // Validate
    if (!validateChatUserId(socket, receiverId, 'receiverId')) return
    if (!content || typeof content !== 'string') return
    const trimmed = content.trim()
    if (trimmed.length === 0 || trimmed.length > 2000) return
    if (senderId === receiverId) return

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: senderId, addresseeId: receiverId },
          { requesterId: receiverId, addresseeId: senderId },
        ],
      },
      select: { id: true },
    })

    if (!friendship) {
      socket.emit('chat:error', {
        code: ErrorCode.FRIENDSHIP_NOT_FOUND,
        message: 'You can only message your friends',
      })
      return
    }

    let message
    try {
      // Save to DB
      message = await prisma.message.create({
        data: { senderId, receiverId, content: trimmed },
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
      })

    } catch (err) {
      console.error('Chat message save failed:', err)
      socket.emit('chat:error', {
        code: ErrorCode.MESSAGE_SEND_FAILED,
        message: 'Failed to send message',
      })
      return
    }

    const receiverSockets = await io.in(receiverId).fetchSockets()
    const isConversationOpen = receiverSockets.some(
      (receiverSocket) => receiverSocket.data.activeChatUserId === senderId,
    )

    // Send the saved message to the receiver and confirm it to the sender.
    io.to(receiverId).emit('chat:message', message)
    socket.emit('chat:sent', message)

    try {
      if (!isConversationOpen) {
        await createNotification(
          receiverId,
          'MESSAGE',
          'sent you a message',
          senderId,
          senderId,
        )

        io.to(receiverId).emit('notification:new', {
          type: 'MESSAGE',
          message: 'sent you a message',
          refId: senderId,
        })
      }
    } catch (err) {
      console.error('Chat notification creation failed:', err)
    }
  })

  // ── chat:read ────────────────────────────────────────────────
  // Client emits when user opens a conversation — marks messages as read
  socket.on('chat:read', async (payload: { senderId: string }) => {
    if (!payload || typeof payload.senderId !== 'string' || !payload.senderId) return
    if (!validateChatUserId(socket, payload.senderId, 'senderId')) return

    socket.data.activeChatUserId = payload.senderId

    await prisma.message.updateMany({
      where: {
        senderId: payload.senderId,
        receiverId: senderId,
        isRead: false,
      },
      data: { isRead: true },
    })

    await prisma.notification.updateMany({
      where: {
        userId: senderId,
        type: 'MESSAGE',
        refId: payload.senderId,
        isRead: false,
      },
      data: { isRead: true },
    })

    socket.emit('notifications:messages-read', { senderId: payload.senderId })

    // Tell the sender their messages were read
    io.to(payload.senderId).emit('chat:read', { by: senderId })
  })

  socket.on('chat:close', () => {
    delete socket.data.activeChatUserId
  })
}
