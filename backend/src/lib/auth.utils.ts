import jwt from 'jsonwebtoken'
import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from './error-codes.js'

// Allowed user roles.
export type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN'

const VALID_AUTH_ROLES: readonly AuthRole[] = ['USER', 'MODERATOR', 'ADMIN']

// Check that value is an object.
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

// Check that role is one of our allowed roles.
const isAuthRole = (role: string): role is AuthRole => {
  return VALID_AUTH_ROLES.some((validRole) => validRole === role)
}

// Get JWT secret from env.
const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, 'Server misconfiguration: JWT secret is missing')
  }

  return jwtSecret
}

// Create token with user id, role, and CSRF token.
export const signAuthToken = (userId: string, role: AuthRole, csrfToken: string) => {
  return jwt.sign({ userId, role, csrfToken }, getJwtSecret(), { expiresIn: '7d' })
}

// Verify token and return safe payload.
export const verifyAuthToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (!isRecord(decoded)) {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    const { userId, role, csrfToken } = decoded
    if (typeof userId !== 'string' || typeof csrfToken !== 'string') {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    if (typeof role !== 'string' || !isAuthRole(role)) {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    return {
      userId,
      role,
      csrfToken,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
  }
}
