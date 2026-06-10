import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware.js'

type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN'

const ROLE_RANK: Record<AuthRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
}

/**
 * Guard protected routes by requiring a minimum role.
 * MODERATOR also allows ADMIN, while ADMIN allows only ADMIN.
 */
function requireRole(requiredRole: AuthRole) {
  return function roleMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    if (ROLE_RANK[req.user.role] < ROLE_RANK[requiredRole]) {
      throw new AppError(403, 'Forbidden: insufficient role')
    }

    next()
  }
}

export { requireRole }
