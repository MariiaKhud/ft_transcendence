import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'

// Creating a new router instance for authentication routes
const router = Router()

// Regular expressions for validating email and username formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// Constants for authentication cookie name and max age (7 days in milliseconds)
const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN'                    // Defining a TypeScript type for user roles, which can be 'USER', 'MODERATOR', or 'ADMIN'. This type will be used to enforce role-based access control in the application.
const VALID_AUTH_ROLES: readonly AuthRole[] = ['USER', 'MODERATOR', 'ADMIN']  // Defining valid authentication roles as a typed constant array for validation purposes

const normalizeEmail = (email: string) => {
  return email.trim().toLowerCase()
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isAuthRole = (role: string): role is AuthRole => {
  return VALID_AUTH_ROLES.some((validRole) => validRole === role)
}

const isPrismaUniqueConstraintError = (error: unknown) => {
  return isRecord(error) && error.code === 'P2002'
}

const validatePasswordLength = (password: string) => {
  // 72 characters is the maximum length for bcrypt hashing, so we enforce that limit here
  if (password.length < 8 || password.length > 72) {
    throw new AppError(400, 'Validation failed: password must be between 8 and 72 characters')
  }
}

const readAuthTokenFromCookie = (req: Request) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError(401, 'Authentication required')
  }

  return token
}

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

const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new AppError(500, 'Server misconfiguration: JWT secret is missing')
  }

  return jwtSecret
}

const publicUserSelect: Prisma.UserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  xp: true,
  level: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
}

const generateCsrfToken = () => {
  return randomBytes(32).toString('hex')
}

const signAuthToken = (userId: string, role: string, csrfToken: string) => {
  return jwt.sign({ userId, role, csrfToken }, getJwtSecret(), { expiresIn: '7d' })
}

const verifyAuthToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (!isRecord(decoded)) {
      throw new AppError(401, 'Invalid or expired session')
    }

    const { userId, role, csrfToken } = decoded
    if (typeof userId !== 'string' || typeof csrfToken !== 'string') {
      throw new AppError(401, 'Invalid or expired session')
    }

    if (typeof role !== 'string' || !isAuthRole(role)) {
      throw new AppError(401, 'Invalid or expired session')
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

    throw new AppError(401, 'Invalid or expired session')
  }
}

const validateRegisterInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, 'Validation failed: email, username, and password are required')
  }

  // Check if email, username, and password are present and of type string
  if (typeof body.email !== 'string' ||
    typeof body.username !== 'string' ||
    typeof body.password !== 'string') {
    throw new AppError(400, 'Validation failed: email, username, and password are required')
  }

  // Trim and normalize email and username, and keep password as is for hashing
  const email = normalizeEmail(body.email)
  const username = body.username.trim()
  const password = body.password

  // Validate email format, username format, and password length
  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'Validation failed: invalid email format')
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(
      400, 'Validation failed: username must be 3-20 characters and contain only letters, numbers, or _'
    )
  }

  validatePasswordLength(password)

  // Optional displayName field is validated if provided, trimming whitespace and allowing it to be undefined if empty
  let displayName: string | undefined
  if (typeof body.displayName === 'string') {
    const trimmedDisplayName = body.displayName.trim()
    displayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined
  }

  return { email, username, password, displayName }
}

const validateLoginInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, 'Validation failed: email and password are required')
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new AppError(400, 'Validation failed: email and password are required')
  }

  const email = normalizeEmail(body.email)
  const password = body.password

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'Validation failed: invalid email format')
  }

  validatePasswordLength(password)

  return { email, password }
}

const registerHandler = async (req: Request, res: Response) => {
  const registerInput = validateRegisterInput(req.body) // Validate the input for registration, ensuring required fields are present and properly formatted.
  const { email, username, password, displayName } = registerInput // Destructure the validated input for easier access in the subsequent code.

  // Check for existing users with the same email or username in parallel to optimize performance
  const [existingEmailUser, existingUsernameUser] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ])

  if (existingEmailUser) {
    throw new AppError(409, 'Email already taken')
  }

  if (existingUsernameUser) {
    throw new AppError(409, 'Username already taken')
  }

  // Hash the password using bcrypt with a salt round of 10, which is a good balance between security and performance
  const passwordHash = await bcrypt.hash(password, 10)

  // Create the new user in the database with the provided email, username, hashed password, and optional displayName.
  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
      },
      select: publicUserSelect,
    })

    // Respond with the created user data (excluding password hash) and a success status of true
    res.status(201).json({ success: true, data: user })
  } catch (error) {
    // Handle unique constraint violation errors from Prisma (e.g., if another user was created with the same email/username
    // between the checks and creation)
    // P2002 is the Prisma error code for unique constraint violations
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(409, 'Email or username already taken')
    }

    throw error
  }
}

const loginHandler = async (req: Request, res: Response) => {
  const { email, password } = validateLoginInput(req.body)

  // Find the user by email and select the necessary fields for authentication and response.
  // ... - spread operator is used to include all fields defined in publicUserSelect.
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...publicUserSelect,
      passwordHash: true,
    },
  })

  if (!user) {
    throw new AppError(401, 'Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password')
  }

  const csrfToken = generateCsrfToken()
  const token = signAuthToken(user.id, user.role, csrfToken)

  setAuthCookies(res, token, csrfToken)

  const { passwordHash: _passwordHash, ...publicUser } = user
  res.status(200).json({ success: true, data: publicUser })
}

const validateCsrfToken = (req: Request, tokenCsrf: string) => {
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME]
  const csrfHeader = req.header(CSRF_HEADER_NAME)

  if (typeof csrfCookie !== 'string' || typeof csrfHeader !== 'string') {
    throw new AppError(403, 'CSRF validation failed')
  }

  if (csrfCookie !== csrfHeader || csrfCookie !== tokenCsrf) {
    throw new AppError(403, 'CSRF validation failed')
  }
}

const logoutHandler = async (req: Request, res: Response) => {
  const token = readAuthTokenFromCookie(req)

  // Validate CSRF token before allowing logout to prevent CSRF attacks that could log the user out without their intention.
  const { csrfToken } = verifyAuthToken(token)
  validateCsrfToken(req, csrfToken)

  clearAuthCookies(res)

  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

const meHandler = async (req: Request, res: Response) => {
  const token = readAuthTokenFromCookie(req)

  const { userId } = verifyAuthToken(token)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  })

  if (!user) {
    throw new AppError(401, 'Invalid or expired session')
  }

  res.status(200).json({ success: true, data: user })
}

router.post('/register', handleAsyncErrors(registerHandler))
router.post('/login', handleAsyncErrors(loginHandler))
router.post('/logout', handleAsyncErrors(logoutHandler))
router.get('/me', handleAsyncErrors(meHandler))

export { verifyAuthToken }
export default router
