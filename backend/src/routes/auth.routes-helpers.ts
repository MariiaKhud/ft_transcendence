import { randomBytes } from 'crypto'
import type { Request, Response } from 'express'
import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// Cookie and header names used in auth.
const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// Clean email before checking or saving.
const normalizeEmail = (email: string) => {
  return email.trim().toLowerCase()
}

// Small type guard for unknown values.
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

// Prisma code P2002 means a unique field already exists.
const isPrismaUniqueConstraintError = (error: unknown) => {
  return isRecord(error) && error.code === 'P2002'
}

// Keep password length in bcrypt's safe range.
const validatePasswordLength = (password: string) => {
  if (password.length < 8 || password.length > 72) {
    throw new AppError(400, ErrorCode.VALIDATION_PASSWORD_LENGTH, 'Validation failed: password must be between 8 and 72 characters')
  }
}

// Read auth token from cookie or fail.
const readAuthTokenFromCookie = (req: Request) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  return token
}

// Set auth and CSRF cookies after login.
const setAuthCookies = (res: Response, authToken: string, csrfToken: string) => {
  res.cookie(AUTH_COOKIE_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  })

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  })
}

// Clear both auth cookies on logout.
const clearAuthCookies = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

// Public user fields safe to send to client.
const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  preferredLanguage: true,
  xp: true,
  level: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const

// Login needs public fields plus password hash.
const loginUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
} as const

// Random token used to protect write requests.
const generateCsrfToken = () => {
  return randomBytes(32).toString('hex')
}

// Validate and normalize register payload.
const validateRegisterInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, ErrorCode.VALIDATION_REGISTER_FIELDS_REQUIRED, 'Validation failed: email, username, and password are required')
  }

  if (typeof body.email !== 'string' || typeof body.username !== 'string' || typeof body.password !== 'string') {
    throw new AppError(400, ErrorCode.VALIDATION_REGISTER_FIELDS_REQUIRED, 'Validation failed: email, username, and password are required')
  }

  const email = normalizeEmail(body.email)
  const username = body.username.trim()
  const password = body.password

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, ErrorCode.VALIDATION_EMAIL_INVALID, 'Validation failed: invalid email format')
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(400, ErrorCode.VALIDATION_USERNAME_INVALID, 'Validation failed: username must be 3-20 characters and contain only letters, numbers, or _')
  }

  validatePasswordLength(password)

  let displayName: string | undefined
  if (typeof body.displayName === 'string') {
    const trimmedDisplayName = body.displayName.trim()
    displayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined
  }

  return { email, username, password, displayName }
}

// Validate and normalize login payload.
const validateLoginInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, ErrorCode.VALIDATION_LOGIN_FIELDS_REQUIRED, 'Validation failed: email and password are required')
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new AppError(400, ErrorCode.VALIDATION_LOGIN_FIELDS_REQUIRED, 'Validation failed: email and password are required')
  }

  const email = normalizeEmail(body.email)
  const password = body.password

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, ErrorCode.VALIDATION_EMAIL_INVALID, 'Validation failed: invalid email format')
  }

  return { email, password }
}

// CSRF is valid only when cookie, header, and token all match.
const validateCsrfToken = (req: Request, tokenCsrf: string) => {
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME]
  const csrfHeader = req.header(CSRF_HEADER_NAME)

  if (typeof csrfCookie !== 'string' || typeof csrfHeader !== 'string') {
    throw new AppError(403, ErrorCode.CSRF_INVALID, 'CSRF validation failed')
  }

  if (csrfCookie !== csrfHeader || csrfCookie !== tokenCsrf) {
    throw new AppError(403, ErrorCode.CSRF_INVALID, 'CSRF validation failed')
  }
}

export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_MS,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  clearAuthCookies,
  generateCsrfToken,
  isPrismaUniqueConstraintError,
  loginUserSelect,
  publicUserSelect,
  readAuthTokenFromCookie,
  setAuthCookies,
  validateCsrfToken,
  validateLoginInput,
  validateRegisterInput,
}