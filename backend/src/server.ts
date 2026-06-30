import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { errorHandler } from './middleware/error.middleware.js'
import { prisma } from './lib/prisma.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://localhost'

const handleHealthCheck = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}

const handleNotFound = (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}

const handleServerStart = () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`🌐 CORS origin: ${FRONTEND_URL}`)
}

const handleGracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(async () => {
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

// CORS configuration
app.use(
  cors({
    origin: FRONTEND_URL,
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

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get('/health', handleHealthCheck)

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)                       // Authentication routes (register, login, logout, etc.)
app.use('/api/users', userRoutes)                      // User routes (profile management, user listing, etc.)

// TODO: Wire up route modules here
// app.use('/api/articles', articleRoutes)
// app.use('/api/comments', commentRoutes)
// app.use('/api/friends', friendshipRoutes)
// app.use('/api/messages', messageRoutes)
// app.use('/api/notifications', notificationRoutes)
// app.use('/api/gamification', gamificationRoutes)

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

const server = app.listen(PORT, handleServerStart)

// Graceful shutdown
process.on('SIGINT', handleGracefulShutdown)

process.on('SIGTERM', handleGracefulShutdown)

export default app
