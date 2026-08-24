import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { parse as parseCookie } from 'cookie'
import { verifyAuthToken } from '../lib/auth.utils.js'
import { readAuthTokenFromCookie } from '../routes/auth.routes-helpers.js'
import { registerChatHandlers } from './socket.handlers.js'
import { prisma } from '../lib/prisma.js'

// Global io instance — imported by handlers that need to emit to other users
export let io: Server

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

  // ── Auth middleware ──────────────────────────────────────────
  // Runs before 'connection' — rejects unauthenticated sockets
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? ''
      const cookies = parseCookie(cookieHeader)
      const token = cookies['token'] ?? cookies['auth_token'] ?? ''

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = verifyAuthToken(token)
      // Attach user data to socket — accessible in all handlers
      socket.data.userId = decoded.userId
      socket.data.role = decoded.role

      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  // ── Connection ───────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string

    // Each user joins their personal room (their userId)
    await socket.join(userId)

    // Mark online in DB
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    // Tell this user's friends they came online
    const friends = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    })

    friends.forEach(({ requesterId, addresseeId }) => {
      const friendId = requesterId === userId ? addresseeId : requesterId
      io.to(friendId).emit('user:online', { userId })
    })

    // Register all chat event handlers
    registerChatHandlers(io, socket)

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeenAt: new Date() },
      })

      // Tell friends they went offline
      friends.forEach(({ requesterId, addresseeId }) => {
        const friendId = requesterId === userId ? addresseeId : requesterId
        io.to(friendId).emit('user:offline', { userId })
      })
    })
  })

  console.log('Socket.io server initialised')
}
