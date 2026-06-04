import { Router } from 'express'                                        // For creating route handlers
import type { Request, Response } from 'express'                        // For type annotations in route handlers
import bcrypt from 'bcryptjs'                                           // For password hashing
import { prisma } from '../lib/prisma.js'                               // Prisma client instance for database operations
import { AppError, handleAsyncErrors } from '../middleware/errorHandler.js'  // Custom error class and async handler utility for error handling in routes

// Creating a new router instance for authentication routes
const router = Router()

// Regular expressions for validating email and username formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

/**
 * @brief validateRegisterInput is a helper function that validates the input for the registration endpoint.
 * It checks for the presence and types of required fields (email, username, password) and validates their formats.
 * It also handles optional displayName field. If validation fails, it throws an AppError with a 400 status code.
 * @function validateRegisterInput
 * @param {unknown} body - The request body to be validated, expected to contain email, username, password, and optionally displayName.
 * @returns {Object} An object containing the validated and normalized email, username, password, and displayName (if provided).
 * @throws {AppError} Throws an AppError with a 400 status code if validation fails for any of the required fields or formats.
 */
const validateRegisterInput = (body: unknown) => {
  const payload = body as {
    email?: unknown
    username?: unknown
    password?: unknown
    displayName?: unknown
  }

  // Check if email, username, and password are present and of type string
  if (typeof payload?.email !== 'string' ||
    typeof payload?.username !== 'string' ||
    typeof payload?.password !== 'string') {
    throw new AppError(400, 'Validation failed: email, username, and password are required')
  }

  // Trim and normalize email and username, and keep password as is for hashing
  const email = payload.email.trim().toLowerCase()
  const username = payload.username.trim()
  const password = payload.password

  // Validate email format, username format, and password length
  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'Validation failed: invalid email format')
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(
      400, 'Validation failed: username must be 3-20 characters and contain only letters, numbers, or _'
    )
  }

  // Password length is checked without trimming to allow leading/trailing spaces if the user intentionally includes them
  // 72 characters is the maximum length for bcrypt hashing, so we enforce that limit here
  if (password.length < 8 || password.length > 72) {
    throw new AppError(400, 'Validation failed: password must be between 8 and 72 characters')
  }

  // Optional displayName field is validated if provided, trimming whitespace and allowing it to be undefined if empty
  let displayName: string | undefined
  if (typeof payload.displayName === 'string') {
    const trimmedDisplayName = payload.displayName.trim()
    displayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined
  }

  return { email, username, password, displayName }
}

/**
 * @route POST /api/auth/register
 * @desc Register a new user with email, username, password, and optional displayName. Validates input, checks for existing users,
 * hashes the password, and creates a new user in the database. Responds with the created user data (excluding password hash)
 * on success.
 * @access Public
 * @returns {Object} JSON response containing success status and created user data (id, email, username, displayName, avatarUrl,
 * bio, role, xp, level, isOnline, lastSeenAt, createdAt, updatedAt).
 * @throws {AppError} Throws AppError with appropriate status codes and messages for validation failures or if email/username
 * is already taken.
 */
router.post('/register', handleAsyncErrors(async (req: Request, res: Response) => {
    const { email, username, password, displayName } = validateRegisterInput(req.body)

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
        select: {
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
        },
      })

	  // Respond with the created user data (excluding password hash) and a success status of true
      res.status(201).json({success: true, data: user,})
    } catch (error) {
	  // Handle unique constraint violation errors from Prisma (e.g., if another user was created with the same email/username
	  // between the checks and creation)
	  // P2002 is the Prisma error code for unique constraint violations
      if (typeof error === 'object' && error !== null && 'code' in error &&
        (error as { code?: string }).code === 'P2002') {
        throw new AppError(409, 'Email or username already taken')
      }

      throw error
    }
  })
)

// Additional authentication routes (e.g., login, logout, password reset) would be implemented here following similar patterns
// of input validation, error handling, and response formatting.
export default router
