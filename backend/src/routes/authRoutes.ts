import { Router } from 'express'                                             // For creating route handlers
import type { Request, Response } from 'express'                             // For type annotations in route handlers
import bcrypt from 'bcryptjs'                                                // For password hashing
import jwt from 'jsonwebtoken'                                               // For creating signed authentication tokens
import type { Prisma } from '@prisma/client'                                 // For strongly-typed Prisma select objects
import { prisma } from '../lib/prisma.js'                                    // Prisma client instance for database operations
import { AppError, handleAsyncErrors } from '../middleware/errorHandler.js'  // Custom error class and async handler utility for error handling in routes

// Creating a new router instance for authentication routes
const router = Router()

// Regular expressions for validating email and username formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// Constants for authentication cookie name and max age (7 days in milliseconds)
const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * @brief getJwtSecret is a helper function that retrieves the JWT secret key from environment variables. It checks if the secret is defined and throws an AppError
 * if it is missing, indicating a server misconfiguration. This function ensures that the application has a valid secret key for signing and verifying JWT tokens,
 * which is crucial for the security of the authentication system.
 * @function getJwtSecret
 * @returns {string} The JWT secret key retrieved from environment variables.
 * @throws {AppError} Throws an AppError with a 500 status code if the JWT secret is missing from environment variables, indicating a server misconfiguration.
 */
const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new AppError(500, 'Server misconfiguration: JWT secret is missing')
  }

  return jwtSecret
}

/**
 * @brief publicUserSelect is a Prisma select object that defines which fields of the User model should be included
 * when querying for public user information. This helps in controlling the exposure of sensitive user data.
 * @constant {Prisma.UserSelect} publicUserSelect - The Prisma select object for public user fields.
 */
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

/**
 * @brief signAuthToken is a helper function that creates a signed JWT token containing the user's ID and role.
 * The token is signed using a secret key and has an expiration time of 7 days. This token will be used for authenticating
 * subsequent requests from the client.
 * @function signAuthToken
 * @param {string} userId - The unique identifier of the user for whom the token is being created.
 * @param {string} role - The role of the user (e.g., 'user', 'admin') to be included in the token payload.
 * @returns {string} A signed JWT token that can be sent to the client for authentication purposes.
 */
const signAuthToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '7d' })
}

/**
 * @brief verifyAuthToken is a helper function that verifies the provided JWT token and extracts the user ID from it.
 * It checks if the token is valid and not expired, and ensures that the payload contains a valid userId. If the token
 * is invalid or expired, it throws an AppError with a 401 status code indicating that authentication is required.
 * @function verifyAuthToken
 * @param {string} token - The JWT token to be verified, typically extracted from the authentication cookie in incoming requests.
 * @returns {string} The user ID extracted from the token payload if the token is valid.
 * @throws {AppError} Throws an AppError with a 401 status code if the token is invalid, expired, or does not contain a valid userId.
 */
const verifyAuthToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (typeof decoded === 'string') {
      throw new AppError(401, 'Invalid or expired session')
    }

    const payload = decoded as { userId?: unknown }
    if (typeof payload.userId !== 'string') {
      throw new AppError(401, 'Invalid or expired session')
    }

    return payload.userId
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(401, 'Invalid or expired session')
  }
}

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
 * @brief validateLoginInput is a helper function that validates the input for the login endpoint. It checks for the presence and types of
 * required fields (email and password) and validates their formats. If validation fails, it throws an AppError with a 400 status code.
 * @function validateLoginInput
 * @param {unknown} body - The request body to be validated, expected to contain email and password.
 * @returns {Object} An object containing the validated and normalized email and password.
 * @throws {AppError} Throws an AppError with a 400 status code if validation fails for any of the required fields or formats.
 */
const validateLoginInput = (body: unknown) => {
  const payload = body as {
    email?: unknown
    password?: unknown
  }

  if (typeof payload?.email !== 'string' || typeof payload?.password !== 'string') {
    throw new AppError(400, 'Validation failed: email and password are required')
  }

  const email = payload.email.trim().toLowerCase()
  const password = payload.password

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'Validation failed: invalid email format')
  }

  if (password.length < 8 || password.length > 72) {
    throw new AppError(400, 'Validation failed: password must be between 8 and 72 characters')
  }

  return { email, password }
}

/**
 * @brief registerHandler is the route handler for the user registration endpoint. It validates the input, checks for existing users with
 * the same email or username, hashes the password, and creates a new user in the database. It responds with the created user data (excluding
 * the password hash) and a success status. If any validation or database operation fails, it throws an AppError with an appropriate status
 * code and message.
 * @function registerHandler
 * @param {Request} req - The Express Request object containing the registration data in the body.
 * @param {Response} res - The Express Response object used to send the response back to the client.
 * @throws {AppError} Throws an AppError with a 400 status code for validation errors, 409 for conflicts (email/username already taken),
 * or other errors as they occur.
 */
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
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: string }).code === 'P2002') {
      throw new AppError(409, 'Email or username already taken')
    }

    throw error
  }
}

/**
 * @brief loginHandler is the route handler for the user login endpoint. It validates the input, checks if a user with the provided email exists,
 * compares the provided password with the stored password hash, and if valid, creates a signed JWT token and sets it as an HTTP-only cookie in the response.
 * It responds with the user data (excluding the password hash) and a success status. If any validation or authentication step fails, it throws an AppError
 * with an appropriate status code and message.
 * @function loginHandler
 * @param {Request} req - The Express Request object containing the login data in the body.
 * @param {Response} res - The Express Response object used to send the response back to the client.
 * @throws {AppError} Throws an AppError with a 400 status code for validation errors, 401 for invalid credentials, or other errors as they occur.
 */
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

  const token = signAuthToken(user.id, user.role)

  // Set the JWT token in an HTTP-only cookie to be sent with subsequent requests for authentication.
  // httpOnly: true ensures the cookie is not accessible via JavaScript, secure: true ensures the cookie is only sent over HTTPS in production.
  // sameSite: 'lax' helps protect against CSRF attacks while allowing the cookie to be sent with top-level navigations.
  // maxAge is set to 7 days, matching the token's expiration time.
  // CSRF protection is important when using cookies for authentication, and setting sameSite to 'lax' provides a good balance of security and usability for most applications.
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  })

  const { passwordHash: _passwordHash, ...publicUser } = user
  res.status(200).json({ success: true, data: publicUser })
}

/**
 * @brief logoutHandler is the route handler for the user logout endpoint. It clears the authentication cookie from the client's browser, effectively logging the user out.
 * It responds with a success message indicating that the logout was successful. This endpoint does not require any input validation since it simply clears the cookie.
 * @function logoutHandler
 * @param {Request} _req - The Express Request object (not used in this handler).
 * @param {Response} res - The Express Response object used to send the response back to the client.
 */
const logoutHandler = (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

/**
 * @brief meHandler is the route handler for the endpoint that retrieves the currently authenticated user's information. It checks for the presence of the authentication
 * token in the cookies, verifies it, and if valid, retrieves the user's data from the database and responds with it. If the token is missing, invalid, or expired,
 * it throws an AppError with a 401 status code indicating that authentication is required.
 * @function meHandler
 * @param {Request} req - The Express Request object containing the cookies with the authentication token.
 * @param {Response} res - The Express Response object used to send the response back to the client.
 * @throws {AppError} Throws an AppError with a 401 status code if authentication is required (token missing/invalid/expired) or other errors as they occur.
 */
const meHandler = async (req: Request, res: Response) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError(401, 'Authentication required')
  }

  const userId = verifyAuthToken(token)
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
router.post('/logout', logoutHandler)
router.get('/me', handleAsyncErrors(meHandler))

export default router






// Login
//    ↓
// Backend creates a JWT
//    ↓
// JWT is stored in a Cookie
//    ↓
// The browser automatically sends the Cookie with each request
//    ↓
// Backend reads the JWT
//    ↓
// Backend identifies which user made the request