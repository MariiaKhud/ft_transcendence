import { Router } from 'express'                                             // For creating route handlers
import type { Request, Response } from 'express'                             // For type annotations in route handlers
import { randomBytes } from 'crypto'                                         // For CSRF token generation
import bcrypt from 'bcryptjs'                                                // For password hashing
import jwt from 'jsonwebtoken'                                               // For creating signed authentication tokens
import type { Prisma } from '@prisma/client'                                 // For strongly-typed Prisma select objects
import { prisma } from '../lib/prisma.js'                                    // Prisma client instance for database operations
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'  // Custom error class and async handler utility for error handling in routes

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

/**
 * @brief normalizeEmail is a helper function that takes an email string as input, trims any leading or trailing whitespace, and converts it to lowercase. This normalization
 * ensures that email comparisons are case-insensitive and do not consider extraneous whitespace, which is important for consistent user identification and authentication.
 * @function normalizeEmail
 * @param {string} email - The email string to be normalized.
 * @returns {string} The normalized email string, trimmed and converted to lowercase.
 */
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

/**
 * @brief validatePasswordLength is a helper function that checks if the provided password meets the length requirements. It ensures that the password is
 * at least 8 characters long and does not exceed 72 characters (the maximum length for bcrypt hashing). If the password does not meet these requirements,
 * it throws an AppError with a 400 status code indicating that validation failed.
 * @function validatePasswordLength
 * @param {string} password - The password string to be validated for length.
 * @throws {AppError} Throws an AppError with a 400 status code if the password is shorter than 8 characters or longer than 72 characters.
 */
const validatePasswordLength = (password: string) => {
  // 72 characters is the maximum length for bcrypt hashing, so we enforce that limit here
  if (password.length < 8 || password.length > 72) {
    throw new AppError(400, 'Validation failed: password must be between 8 and 72 characters')
  }
}

/**
 * @brief readAuthTokenFromCookie is a helper function that reads the authentication token from the cookies in the incoming request. It checks if the token is present and
 * is a non-empty string. If the token is missing or invalid, it throws an AppError with a 401 status code indicating that authentication is required. This function is
 * used in protected routes to ensure that the user has a valid session before allowing access to the route's functionality.
 * @function readAuthTokenFromCookie
 * @param {Request} req - The Express Request object containing the cookies from which the authentication token will be read.
 * @returns {string} The authentication token extracted from the cookies if it is valid.
 */
const readAuthTokenFromCookie = (req: Request) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError(401, 'Authentication required')
  }

  return token
}

/**
 * @brief setAuthCookies is a helper function that sets the authentication and CSRF cookies in the response. It configures the cookies with appropriate options for security,
 * such as httpOnly, secure, sameSite, and maxAge. The authentication cookie contains the JWT token, while the CSRF cookie contains the CSRF token. This function is used
 * during login to establish the user's session and provide them with the necessary tokens for authenticated requests.
 * @function setAuthCookies
 * @param {Response} res - The Express Response object used to set the cookies.
 * @param {string} authToken - The JWT authentication token to be set in the auth cookie.
 * @param {string} csrfToken - The CSRF token to be set in the CSRF cookie for CSRF protection.
 */
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

/**
 * @brief clearAuthCookies is a helper function that clears the authentication and CSRF cookies from the client's browser. It sets the cookies with the same names
 * and options as when they were created, but with an empty value and no maxAge, which effectively deletes them. This function is used during logout to remove the
 * user's session cookies and ensure they are logged out securely.
 * @function clearAuthCookies
 * @param {Response} res - The Express Response object used to clear the cookies.
 */
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
 * @brief generateCsrfToken is a helper function that generates a random CSRF token using the crypto module. The token is a 32-byte random string encoded
 * in hexadecimal format. This token is used for CSRF protection by being included in the JWT payload and set as a cookie, allowing the server to validate
 * that incoming requests are legitimate and not forged.
 * @function generateCsrfToken
 * @returns {string} A randomly generated CSRF token in hexadecimal format.
 */
const generateCsrfToken = () => {
  return randomBytes(32).toString('hex')
}

/**
 * @brief signAuthToken is a helper function that creates a signed JWT token containing the user's ID and role.
 * The token is signed using a secret key and has an expiration time of 7 days. This token will be used for authenticating subsequent requests from the client.
 * @function signAuthToken
 * @param {string} userId - The unique identifier of the user for whom the token is being created.
 * @param {string} role - The role of the user (e.g., 'user', 'admin') to be included in the token payload.
 * @param {string} csrfToken - The CSRF token to be included in the JWT payload for CSRF protection.
 * @returns {string} A signed JWT token that can be sent to the client for authentication purposes.
 */
const signAuthToken = (userId: string, role: string, csrfToken: string) => {
  return jwt.sign({ userId, role, csrfToken }, getJwtSecret(), { expiresIn: '7d' })
}

/**
 * @brief verifyAuthToken is a helper function that verifies the provided JWT authentication token using the secret key. It checks if the token is valid and
 * not expired, and extracts the user information (userId, role, and csrfToken) from the token payload. If the token is missing, invalid, or expired, it throws
 * an AppError with a 401 status code indicating that authentication is required. This function is used in protected routes to ensure that the user has a valid
 * session and to retrieve their information for authorization checks.
 * @function verifyAuthToken
 * @param {string} token - The JWT authentication token to be verified.
 * @returns {Object} An object containing the userId, role, and csrfToken extracted from the token payload if the token is valid.
 * @throws {AppError} Throws an AppError with a 401 status code if the token is missing, invalid, or expired.
 */
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

/**
 * @brief validateRegisterInput is a helper function that validates the input for the registration endpoint. It checks for the presence and types of required fields
 * (email, username, and password), normalizes the email, trims the username, and validates the formats of the email and username. It also validates the password length.
 * If any validation fails, it throws an AppError with a 400 status code indicating that validation failed.
 * @function validateRegisterInput
 * @param {unknown} body - The request body to be validated, expected to contain email, username, password, and optionally displayName.
 * @returns {Object} An object containing the validated and normalized email, username, password, and optional displayName.
 * @throws {AppError} Throws an AppError with a 400 status code if validation fails for any of the required fields or formats.
 */
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

/**
 * @brief validateLoginInput is a helper function that validates the input for the login endpoint. It checks for the presence and types of required fields
 * (email and password), and validates the email format. If validation fails, it throws an AppError with a 400 status code.
 * @function validateLoginInput
 * @param {unknown} body - The request body to be validated, expected to contain email and password.
 * @returns {Object} An object containing the validated and normalized email and password.
 * @throws {AppError} Throws an AppError with a 400 status code if validation fails for any of the required fields or formats.
 */
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

/**
 * @brief registerHandler is the route handler for the user registration endpoint. It validates the input, checks for existing users with the same email or username,
 * hashes the password, creates a new user in the database, and responds with the created user data (excluding the password hash) and a success status. If any validation
 * or database operation fails, it throws an AppError with an appropriate status code and message.
 * @function registerHandler
 * @param {Request} req - The Express Request object containing the registration data in the body.
 * @param {Response} res - The Express Response object used to send the response back to the client.
 * @throws {AppError} Throws an AppError with a 400 status code for validation errors, 409 for conflicts (email/username taken), or other errors as they occur.
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
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(409, 'Email or username already taken')
    }

    throw error
  }
}

/**
 * @brief loginHandler is the route handler for the user login endpoint. It validates the input, checks for the existence of a user with the provided email,
 * compares the provided password with the stored password hash, and if valid, generates a JWT token and CSRF token. It sets the authentication and CSRF cookies
 * and responds with the user data (excluding the password hash) and a success status. If any validation or authentication step fails, it throws an AppError with
 * an appropriate status code and message.
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

  const csrfToken = generateCsrfToken()
  const token = signAuthToken(user.id, user.role, csrfToken)

  setAuthCookies(res, token, csrfToken)

  const { passwordHash: _passwordHash, ...publicUser } = user
  res.status(200).json({ success: true, data: publicUser })
}

/**
 * @brief validateCsrfToken is a helper function that validates the CSRF token by comparing the token from the cookie, the token from the request header,
 * and the token from the JWT payload. If any of the tokens are missing or do not match, it throws an AppError with a 403 status code indicating that
 * CSRF validation failed. This function is used to protect against Cross-Site Request Forgery attacks by ensuring that the request is coming from
 * a trusted source and that the user has a valid session.
 * @function validateCsrfToken
 * @param {Request} req - The Express Request object containing the cookies and headers with the CSRF tokens.
 * @param {string} tokenCsrf - The CSRF token extracted from the JWT payload, which should match the tokens in the cookie and header.
 * @throws {AppError} Throws an AppError with a 403 status code if CSRF validation fails due to missing or mismatched tokens.
 */
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

/**
 * @brief logoutHandler is the route handler for the user logout endpoint. It reads the authentication token from the cookies, verifies it to extract the CSRF token,
 * validates the CSRF token to ensure the logout request is legitimate, clears the authentication and CSRF cookies, and responds with a success message. If any step in
 * the process fails (e.g., missing/invalid token, CSRF validation failure), it throws an AppError with an appropriate status code and message.
 * @function logoutHandler
 * @param {Request} req - The Express Request object containing the cookies with the authentication token.
 * @param {Response} res - The Express Response object used to send the response back to the client.
 * @throws {AppError} Throws an AppError with a 401 status code if authentication is required (token missing/invalid) or 403 for CSRF validation failure, or other errors
 * as they occur.
 */
const logoutHandler = async (req: Request, res: Response) => {
  const token = readAuthTokenFromCookie(req)

  // Validate CSRF token before allowing logout to prevent CSRF attacks that could log the user out without their intention.
  const { csrfToken } = verifyAuthToken(token)
  validateCsrfToken(req, csrfToken)

  clearAuthCookies(res)

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
