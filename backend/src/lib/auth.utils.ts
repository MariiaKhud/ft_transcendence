// 1. Makes and checks login tokens (JWT) — creates one when a user logs in, and checks it's still good on every request
// 2. Remembers which tokens were logged out (revokedJtis), so that exact token stops working right away — even before it would normally expire

import { randomUUID } from 'node:crypto'
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

// In-memory set of revoked JWT IDs (jti) for logged-out tokens. This is a simple way to invalidate tokens without a database, but it won't persist across server restarts.
const revokedJtis = new Set<string>()

// Revoke a JWT ID (jti) so that the token is no longer valid.
export const revokeAuthTokenJti = (jti: string) => {
  revokedJtis.add(jti)
}

export const revokeAuthToken = (token: string) => {
  try {
	// Decode the token without verifying it, to get the jti for revocation.
    const decoded = jwt.decode(token)
    if (isRecord(decoded) && typeof decoded.jti === 'string') {
      revokeAuthTokenJti(decoded.jti)
    }
  } catch {
    // Ignore malformed tokens during logout cleanup.
  }
}

// Create token with user id, role, CSRF token, and unique revocation id.
export const signAuthToken = (userId: string, role: AuthRole, csrfToken: string) => {
  const jti = randomUUID()
  return jwt.sign({ userId, role, csrfToken, jti }, getJwtSecret(), { expiresIn: '7d' })
}

// Verify token and return safe payload.
export const verifyAuthToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (!isRecord(decoded)) {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    const { userId, role, csrfToken, jti } = decoded
    if (typeof userId !== 'string' || typeof csrfToken !== 'string' || typeof jti !== 'string') {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    if (typeof role !== 'string' || !isAuthRole(role)) {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    if (revokedJtis.has(jti)) {
      throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
    }

    return {
      userId,
      role,
      csrfToken,
      jti,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
  }
}
