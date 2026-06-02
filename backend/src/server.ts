/**
 * @file server.ts
 * @description This file sets up and starts the Express server for the backend of the application. It configures
 * middleware for security, CORS, body parsing, and cookie handling. The server also defines a health check route,
 * placeholder routes for API endpoints, a 404 handler for undefined routes, and an error handler for centralized
 * error management. Finally, it starts the server and listens on the specified port, with graceful shutdown
 * handlers for SIGINT and SIGTERM signals.
 */




/**
 * @brief express is the web framework used to create the server and define routes.
 * @brief cors is used to enable Cross-Origin Resource Sharing, allowing the frontend to communicate
 * with the backend.
 * @brief cookie-parser is used to parse cookies from incoming requests, which is essential for
 * handling sessions and authentication.
 * @brief helmet is used to set various HTTP headers for security purposes, helping to protect the
 * application from common vulnerabilities.
 * @brief dotenv is used to load environment variables from a .env file, allowing for configuration
 * of the server without hardcoding values in the codebase.
 * @brief errorHandler is a custom middleware for handling errors in a centralized manner, providing
 * consistent error responses across the application.
 */
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://localhost'

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
    allowedHeaders: ['Content-Type', 'Authorization'],
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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

// TODO: Wire up route modules here
// app.use('/api/auth', authRoutes)
// app.use('/api/articles', articleRoutes)
// app.use('/api/users', userRoutes)
// app.use('/api/comments', commentRoutes)
// app.use('/api/friends', friendshipRoutes)
// app.use('/api/messages', messageRoutes)
// app.use('/api/notifications', notificationRoutes)
// app.use('/api/gamification', gamificationRoutes)

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
})

// ─────────────────────────────────────────────
// Error Handler (must be last)
// ─────────────────────────────────────────────

app.use(errorHandler)

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`🌐 CORS origin: ${FRONTEND_URL}`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

export default app
