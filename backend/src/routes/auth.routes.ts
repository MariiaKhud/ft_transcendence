import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { signAuthToken, verifyAuthToken } from '../lib/auth.utils.js'
import {
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
} from './auth.routes-helpers.js'

// Router for all auth endpoints.
const router = Router()

// Create a new user account.
const registerHandler = async (req: Request, res: Response) => {
  const registerInput = validateRegisterInput(req.body)
  const { email, username, password, displayName } = registerInput

  // Check email and username at the same time.
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

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    // Save user with hashed password.
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
      },
      select: publicUserSelect,
    })

    res.status(201).json({ success: true, data: user })
  } catch (error) {
    // Safety check if a unique field was taken between checks.
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(409, 'Email or username already taken')
    }

    throw error
  }
}

// Log in and set auth cookies.
const loginHandler = async (req: Request, res: Response) => {
  const { email, password } = validateLoginInput(req.body)

  const user = await prisma.user.findUnique({
    where: { email },
    select: loginUserSelect,
  })

  if (!user) {
    throw new AppError(401, 'Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password')
  }

  // Create CSRF token and auth token for this session.
  const csrfToken = generateCsrfToken()
  const token = signAuthToken(user.id, user.role, csrfToken)

  setAuthCookies(res, token, csrfToken)

  // Remove password hash before sending user data.
  const { passwordHash: _passwordHash, ...publicUser } = user
  res.status(200).json({ success: true, data: publicUser })
}

// Log out by clearing cookies after CSRF check.
const logoutHandler = async (req: Request, res: Response) => {
  try {
    const token = readAuthTokenFromCookie(req)
    const { csrfToken } = verifyAuthToken(token)
    validateCsrfToken(req, csrfToken)
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw error
    }
  }

  clearAuthCookies(res)

  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

// Get the current logged-in user's public profile.
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

// Auth endpoints.
router.post('/register', handleAsyncErrors(registerHandler))
router.post('/login', handleAsyncErrors(loginHandler))
router.post('/logout', handleAsyncErrors(logoutHandler))
router.get('/me', handleAsyncErrors(meHandler))

export default router
