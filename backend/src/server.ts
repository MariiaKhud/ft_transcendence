



import express from 'express'                                // For creating the Express application and defining routes and middleware
import cors from 'cors'                                      // For enabling Cross-Origin Resource Sharing (CORS) in the Express application, allowing the frontend to make requests to the backend from a different origin
import cookieParser from 'cookie-parser'                     // For parsing cookies in incoming requests, allowing the server to read and manipulate cookies for authentication and other purposes
import helmet from 'helmet'                                  // For setting various HTTP headers for security in the Express application
import dotenv from 'dotenv'                                  // For loading environment variables from a .env file into process.env, allowing for configuration of the application through environment variables
import { errorHandler } from './middleware/error.middleware.js'  // Importing the errorHandler middleware for centralized error handling in the Express application
import authRoutes from './routes/auth.routes.js'             // Importing the authentication routes for handling user registration, login, logout, and other auth-related endpoints. This is a placeholder for where the actual auth routes will be defined and implemented.
import userRoutes from './routes/users.routes.js'            // Importing the user routes for handling user-related endpoints such as profile management, user listing, etc. This is a placeholder for where the actual user routes will be defined and implemented.

dotenv.config()

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
  server.close(() => {
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

// TODO: Wire up route modules here
app.use('/api/auth', authRoutes)                       // Authentication routes (register, login, logout, etc.)
// app.use('/api/articles', articleRoutes)
app.use('/api/users', userRoutes)                      // User routes (profile management, user listing, etc.)
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
