import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import type { AuthRole } from '../lib/auth.utils.js'

// Role priority map for permission checks.
const ROLE_RANK: Record<AuthRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
}

const requireRole = (minimumRole: AuthRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // User must be logged in first.
    if (!req.user) {
      throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
    }

    // Compare user role level with required role level.
    const userRole = req.user.role
    const userLevel = ROLE_RANK[userRole]
    const requiredLevel = ROLE_RANK[minimumRole]

    if (userLevel < requiredLevel) {
      throw new AppError(403, ErrorCode.FORBIDDEN_ROLE, 'Forbidden: insufficient role')
    }

    // Access granted.
    next()
  }
}

export { requireRole }
