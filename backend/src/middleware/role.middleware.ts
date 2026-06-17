import { Request, Response, NextFunction } from 'express'  // Importing necessary types from the Express library to define the types of the parameters for the middleware function.
import { AppError } from './error.middleware.js'           // Importing the AppError class from the error.middleware.js file, which is used to create custom error objects with specific status codes and messages for error handling in the middleware function.

type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN'             // Defining a TypeScript type for user roles, which can be one of 'USER', 'MODERATOR', or 'ADMIN'. This will be used to enforce role-based access control in the application.

// Defining a constant object ROLE_RANK that maps each AuthRole to a numeric rank. This allows for easy comparison of roles to determine if a user has sufficient privileges to access certain routes or perform specific actions based on their role.
const ROLE_RANK: Record<AuthRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
}

const requireRole = (minimumRole: AuthRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {

    // Step 1: the user must be authenticated first.
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    // Step 2: compare the user's role level with the minimum required level.
    const userRole = req.user.role
    const userLevel = ROLE_RANK[userRole]
    const requiredLevel = ROLE_RANK[minimumRole]

    if (userLevel < requiredLevel) {
      throw new AppError(403, 'Forbidden: insufficient role')
    }

    // Step 3: access granted, continue to the next middleware/handler.
    next()
  }
}

export { requireRole }
