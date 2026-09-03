// 1. Checks the login cookie on every request and blocks the request if it's missing or invalid (authMiddleware) — used on routes that require login
// 2. Also has a softer version (optionalAuthMiddleware) that reads the user if logged in, but still lets guests through if there's no valid cookie

import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { verifyAuthToken } from '../lib/auth.utils.js'
import type { AuthRole } from '../lib/auth.utils.js'
import { readAuthTokenFromCookie } from '../routes/auth.routes-helpers.js'

// Add authenticated user data to Express.User so it works with passport typings.
declare global {
  namespace Express {
    interface User {
      userId: string
      role: AuthRole
      csrfToken: string
    }
  }
}

// Like authMiddleware but never rejects — populates req.user if a valid cookie is present,
// otherwise continues as guest. Use on public routes that have auth-dependent behaviour.
const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.auth_token
  if (typeof token === 'string' && token.length > 0) {
    try {
      const decoded = verifyAuthToken(token)
      req.user = { userId: decoded.userId, role: decoded.role, csrfToken: decoded.csrfToken }
    } catch {
      // Invalid / expired token — treat request as guest
    }
  }
  next()
}

const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Read auth token from cookies.
  const token = readAuthTokenFromCookie(req)

  try {
    const decoded = verifyAuthToken(token)

    // Save user data for next middleware/handlers.
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      csrfToken: decoded.csrfToken,
    }
    next()
  } catch (error) {
    // Keep known AppError status codes (401/500/etc.).
    if (error instanceof AppError) {
      throw error
    }

    // Fallback for unknown token errors.
    throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Invalid or expired token')
  }
}

export { authMiddleware, optionalAuthMiddleware }
