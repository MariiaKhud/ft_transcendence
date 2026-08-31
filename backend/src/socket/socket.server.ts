import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { parse as parseCookie } from 'cookie'
import { verifyAuthToken } from '../lib/auth.utils.js'
import { registerChatHandlers } from './socket.handlers.js'
import { prisma } from '../lib/prisma.js'

export let io: Server

const offlineTimers = new Map<string, ReturnType<typeof setTimeout>>()
const GRACE_MS = 30_000  // 30 seconds

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
  // ── Rejects unauthenticated sockets
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? ''
      const cookies = parseCookie(cookieHeader)
      const token = cookies['token'] ?? cookies['auth_token'] ?? ''

      if (!token) {
        return next(new Error('Authentication required'))
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
    const userId = socket.data.userId as string

    console.log(
      `[socket] CONNECTED`,
      'userId:', userId,
      'socketId:', socket.id,
      'time:', new Date().toISOString()
    )

    // Cancel grace period if user reconnects within 30s
    const existingTimer = offlineTimers.get(userId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      offlineTimers.delete(userId)
    }

    // Each user joins their personal room (their userId)
    await socket.join(userId)
    console.log(`[socket] ${userId} joined room ${userId}`)

    // Mark online in DB
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    // Fetch friends once — reused for both online and disconnect events
    const friends = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    })

    const friendIds = friends.map(({ requesterId, addresseeId }) =>
      requesterId === userId ? addresseeId : requesterId
    )

    // Notify friends this user is online
    friendIds.forEach((friendId) => {
      io.to(friendId).emit('user:online', { userId })
    })

    // Register all chat event handlers
    registerChatHandlers(io, socket)

    // ── Disconnect with grace period ───────────────────────────
    // socket.on('disconnect', () => {
    socket.on('disconnect', (reason) => {
      console.log(
        `[socket] DISCONNECTED`,
        'userId:', userId,
        'socketId:', socket.id,
        'reason:', reason,
        'time:', new Date().toISOString()
      )
      console.log(
        `[socket] STARTING GRACE PERIOD`,
        'userId:', userId,
        'duration:', GRACE_MS
      )

      const timer = setTimeout(async () => {
        console.log(
          `[socket] GRACE PERIOD EXPIRED`,
          'userId:', userId,
          'time:', new Date().toISOString()
        )

        offlineTimers.delete(userId)

        // Only mark offline if no other tabs are open
        const activeSockets = await io.in(userId).fetchSockets()

        console.log(
          `[socket] ACTIVE SOCKETS AFTER GRACE`,
          'userId:', userId,
          'count:', activeSockets.length
        )

        // if (activeSockets.length > 0) return
        if (activeSockets.length > 0) {
          console.log(
            `[socket] STILL CONNECTED - keeping user online`,
            'userId:', userId
          )
          return
        }

        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeenAt: new Date() },
        })

        console.log(
          `[socket] USER MARKED OFFLINE`,
          'userId:', userId
        )

        friendIds.forEach((friendId) => {
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
