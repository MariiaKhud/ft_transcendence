import { Request, Response, NextFunction } from 'express'  // Importing necessary types from the Express library to define the types of the parameters for the middleware function.
import { AppError } from './error.middleware.js'           // Importing the AppError class from the error.middleware.js file, which is used to create custom error objects with specific status codes and messages for error handling in the middleware function.

type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN'             // Defining a TypeScript type for user roles, which can be one of 'USER', 'MODERATOR', or 'ADMIN'. This will be used to enforce role-based access control in the application.

// Defining a constant object ROLE_RANK that maps each AuthRole to a numeric rank. This allows for easy comparison of roles to determine if a user has sufficient privileges to access certain routes or perform specific actions based on their role.
const ROLE_RANK: Record<AuthRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
}

/**
 * @brief requireRole is a higher-order Express middleware function that takes a minimum required role as an argument and returns a middleware function that checks
 * if the authenticated user has the necessary role to access a route. It first checks if the user is authenticated by verifying the presence of req.user, then compares
 * the user's role level with the required role level using the ROLE_RANK mapping. If the user does not meet the required role level, it throws an AppError with a 403
 * status code indicating that access is forbidden. If the user has sufficient privileges, it calls next() to pass control to the next middleware or route handler.
 * @function requireRole
 * @param {AuthRole} minimumRole - The minimum required role (USER, MODERATOR, or ADMIN) that a user must have to access the route.
 * @returns {Function} A middleware function that checks the user's role against the required role and either allows access or throws an error.
 * @throws {AppError} Throws an AppError with a 401 status code if the user is not authenticated, or a 403 status code if the user does not have sufficient privileges.
 */
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
