import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware.js'
import { verifyAuthToken } from '../lib/auth.utils.js'
import type { AuthRole } from '../lib/auth.utils.js'
import { readAuthTokenFromCookie } from '../routes/auth.routes-helpers.js'

// Add authenticated user data to req.user.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: AuthRole;
        csrfToken: string;
      };
    }
  }
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
    throw new AppError(401, 'Invalid or expired token')
  }
}

export { authMiddleware }
