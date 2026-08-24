import type { Server, Socket } from 'socket.io'
import { prisma } from '../lib/prisma.js'
import { createNotification } from '../services/notifications.service.js'

export function registerChatHandlers(io: Server, socket: Socket) {
  const senderId = socket.data.userId as string

  // ── chat:send ────────────────────────────────────────────────
  // Client emits this when user sends a message
  socket.on('chat:send', async (payload: { receiverId: string; content: string }) => {
    const { receiverId, content } = payload

    // Validate
    if (!content || typeof content !== 'string') return
    const trimmed = content.trim()
    if (trimmed.length === 0 || trimmed.length > 2000) return
    if (senderId === receiverId) return

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
      socket.emit('chat:error', { message: 'Failed to send message' })
      return
    }

    // Send the saved message to the receiver and confirm it to the sender.
    io.to(receiverId).emit('chat:message', message)
    socket.emit('chat:sent', message)

    try {
      // Notify receiver if they're not in the chat already
      await createNotification(
        receiverId,
        'MESSAGE',
        'sent you a message',
        senderId
      )

      // Push notification in real-time too.
      io.to(receiverId).emit('notification:new', {
        type: 'MESSAGE',
        message: 'sent you a message',
        refId: senderId,
      })
    } catch (err) {
      console.error('Chat notification creation failed:', err)
    }
  })

  // ── chat:read ────────────────────────────────────────────────
  // Client emits when user opens a conversation — marks messages as read
  socket.on('chat:read', async (payload: { senderId: string }) => {
    if (!payload || typeof payload.senderId !== 'string' || !payload.senderId) return

    await prisma.message.updateMany({
      where: {
        senderId: payload.senderId,
        receiverId: senderId,
        isRead: false,
      },
      data: { isRead: true },
    })

    // Tell the sender their messages were read
    io.to(payload.senderId).emit('chat:read', { by: senderId })
  })
}
