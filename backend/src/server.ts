import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { errorHandler } from './middleware/error.middleware.js'
import { ErrorCode } from './lib/error-codes.js'
import { prisma } from './lib/prisma.js'
import { initializeOAuthStrategy, passport } from './auth/oauth.passport.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'
import adminRoutes from './routes/admin.routes.js'
import articleRoutes from './routes/articles.routes.js'
import commentRoutes from './routes/comments.routes.js'
import friendsRoutes from './routes/friends.routes.js';
import followsRoutes from './routes/follows.routes.js';
import { startOnlineStatusJob } from './jobs/onlineStatus.job.js';
import notificationsRoutes from './routes/notifications.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import { createServer } from 'http';
import { initSocketServer } from './socket/socket.server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://localhost'

// Initialize auth integrations before routes mount so startup fails fast on bad config.
initializeOAuthStrategy()

const handleHealthCheck = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}

const handleNotFound = (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    code: ErrorCode.ROUTE_NOT_FOUND,
    error: 'Route not found',
  })
}

const handleServerStart = () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`🌐 CORS origin: ${FRONTEND_URL}`)
}

const handleGracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...')
  httpServer.close(async () => {
    await prisma.$disconnect()
    console.log('✅ Server closed')
    process.exit(0)
  })
}

// ─────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────

// Helmet sets various HTTP headers for security
app.use(helmet())

// CORS configuration - allow both http and https for localhost dev
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:5173', // Vite dev server
  'http://localhost:5174',
  'http://localhost:8080', // nginx HTTP port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:8080',
  'https://localhost',
  'https://127.0.0.1',
  'https://localhost:443',
  'https://localhost:3000',
  'https://localhost:8443', // nginx HTTPS port
  'https://127.0.0.1:443',
  'https://127.0.0.1:3000',
  'https://127.0.0.1:8443',
]

// ─────────────────────────────────────────────
// CORS Middleware
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        // Return no CORS headers for unknown origins without turning it into a 500.
        callback(null, false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  })
)

// ─────────────────────────────────────────────
// Body & Cookie Middleware
// ─────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())
// Passport must be mounted before the auth routes so OAuth callbacks can use it.
app.use(passport.initialize())

// ─────────────────────────────────────────────
// Static Files
// ─────────────────────────────────────────────

// Serve uploaded avatars at /uploads/<filename>. CVs use authenticated routes
// and must not be reachable through this public static mount.
const uploadsDir = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.resolve(__dirname, '../../uploads')
const publicAvatarFiles = express.static(uploadsDir)
app.use('/uploads', (req, res, next) => {
  const extension = path.extname(req.path).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    next()
    return
  }

  publicAvatarFiles(req, res, next)
})

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get('/health', handleHealthCheck)

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)                       // Authentication routes (register, login, logout, etc.)
app.use('/api/users', userRoutes)                      // User routes (profile management, user listing, etc.)
app.use('/api/admin', adminRoutes)                     // Admin routes (user management, role management, content moderation, and dashboard)
app.use('/api/articles', articleRoutes)                // Articles routes (global feed, search, filtering)
app.use('/api/comments', commentRoutes)                // Comments routes (edit comment)
app.use('/api/friends', friendsRoutes);                // Friend system (send/accept requests, list friends, remove friends)
app.use('/api/follows', followsRoutes);                // Follow system (follow/unfollow authors)
app.use('/api/notifications', notificationsRoutes);    // Notification system (list user notifications)
app.use('/api/messages', messagesRoutes);              // Private messaging (send messages, retrieve conversations)

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────

app.use(handleNotFound)

// ─────────────────────────────────────────────
// Error Handler (must be last)
// ─────────────────────────────────────────────

app.use(errorHandler)

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const httpServer = createServer(app)          // ← wrap app in http server
initSocketServer(httpServer)                  // ← attach socket.io

httpServer.listen(PORT, () => {               // ← listen on httpServer, not app
  handleServerStart()
  startOnlineStatusJob()                      // keep as fallback for missed disconnects
})

// Graceful shutdown
process.on('SIGINT', handleGracefulShutdown)

process.on('SIGTERM', handleGracefulShutdown)

export default app
