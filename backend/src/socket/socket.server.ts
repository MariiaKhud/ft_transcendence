import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { parse as parseCookie } from 'cookie'
import { verifyAuthToken } from '../lib/auth.utils.js'
import { registerChatHandlers } from './socket.handlers.js'
import { prisma } from '../lib/prisma.js'

export let io: Server

const offlineTimers = new Map<string, ReturnType<typeof setTimeout>>()
const GRACE_MS = 30_000  // 30 seconds

async function getFriendIds(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  })

  return friendships.map(({ requesterId, addresseeId }) =>
    requesterId === userId ? addresseeId : requesterId
  )
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL ?? 'https://localhost',
        'https://localhost:8443',
        'https://127.0.0.1:8443',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
      credentials: true,   // needed so the browser sends the HttpOnly cookie
    },
  })

  // ── Auth middleware — runs before every connection ───────────
  // ── No cookie at all: let the socket through as a guest (read-only access
  // to public rooms, e.g. the feed). A present-but-invalid/expired token is
  // still rejected outright — mirrors optionalAuthMiddleware's HTTP behavior.
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? ''
      const cookies = parseCookie(cookieHeader)
      const token = cookies['token'] ?? cookies['auth_token'] ?? ''

      if (!token) {
        return next()
      }

      const decoded = verifyAuthToken(token)
      socket.data.userId = decoded.userId
      socket.data.role = decoded.role

      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  // ── Single connection handler ────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string | undefined

    if (!userId) {
      // Guest connection: only public, read-only feed live-updates are available —
      // no personal room, online-status, friends, chat, or notification handling.
      socket.on('feed:join', () => {
        socket.join('feed')
      })

      socket.on('feed:leave', () => {
        socket.leave('feed')
      })

      return
    }

    // Cancel grace period if user reconnects within 30s
    const existingTimer = offlineTimers.get(userId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      offlineTimers.delete(userId)
    }

    // Each user joins their personal room (their userId)
    await socket.join(userId)

    // A token can outlive account deletion; close that stale socket without crashing the server.
    const onlineUpdate = await prisma.user.updateMany({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    if (onlineUpdate.count === 0) {
      socket.disconnect(true)
      return
    }

    const friendIds = await getFriendIds(userId)

    // Notify friends this user is online
    friendIds.forEach((friendId) => {
      io.to(friendId).emit('user:online', { userId })
    })

    // Register all chat event handlers
    registerChatHandlers(io, socket)

    // Article viewers join a per-article room so they can receive live comment/like updates.
    // Also marks the socket as "viewing" this article, so a new comment or like doesn't
    // generate a notification while the author is already looking at it — mirrors
    // how chat:read suppresses MESSAGE notifications for an open conversation.
    socket.on('article:join', async (articleId: string) => {
      if (typeof articleId !== 'string' || !articleId) return

      socket.data.activeArticleId = articleId
      await socket.join(`article:${articleId}`)

      await prisma.notification.updateMany({
        where: { userId, type: { in: ['COMMENT', 'LIKE'] }, refId: articleId, isRead: false },
        data: { isRead: true },
      })
      socket.emit('notifications:comments-read', { articleId })
    })

    socket.on('article:leave', (articleId: string) => {
      if (typeof articleId !== 'string' || !articleId) return

      if (socket.data.activeArticleId === articleId) {
        delete socket.data.activeArticleId
      }
      socket.leave(`article:${articleId}`)
    })

    // Clients viewing the article feed join this room so like/comment count
    // changes can be pushed to visible cards without refetching the whole page.
    // Scoped to feed viewers only, not broadcast to every connected socket.
    socket.on('feed:join', () => {
      socket.join('feed')
    })

    socket.on('feed:leave', () => {
      socket.leave('feed')
    })

    // ── Disconnect with grace period ───────────────────────────
    socket.on('disconnect', () => {

      const timer = setTimeout(async () => {
        offlineTimers.delete(userId)

        // Only mark offline if no other tabs are open
        const activeSockets = await io.in(userId).fetchSockets()

        if (activeSockets.length > 0) return

        // updateMany (not update): the user may have been deleted since this socket
        // connected — that must not throw and crash the whole process off an
        // unhandled rejection in this timer.
        const updated = await prisma.user.updateMany({
          where: { id: userId },
          data: { isOnline: false, lastSeenAt: new Date() },
        })

        if (updated.count === 0) return

        const currentFriendIds = await getFriendIds(userId)

        currentFriendIds.forEach((friendId) => {
          io.to(friendId).emit('user:offline', { userId })
        })
      }, GRACE_MS)

      offlineTimers.set(userId, timer)
    })
  })

  console.log('Socket.io server initialised')
}

// Called on logout — skips grace period, marks offline immediately
export async function forceOffline(userId: string) {
  const timer = offlineTimers.get(userId)
  if (timer) {
    clearTimeout(timer)
    offlineTimers.delete(userId)
  }

  // Disconnect all sockets for this user
  const sockets = await io.in(userId).fetchSockets()
  sockets.forEach((s) => s.disconnect(true))

  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeenAt: new Date() },
  })
}
