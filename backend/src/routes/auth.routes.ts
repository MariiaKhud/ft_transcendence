import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomBytes } from 'crypto'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { signAuthToken, verifyAuthToken } from '../lib/auth.utils.js'
import type { NormalizedOAuthUser } from '../auth/oauth.passport.js'
import { getOAuthConfig } from '../auth/oauth.config.js'
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

const OAUTH_ERROR_CODE_PARAM = 'code'
const OAUTH_STATE_COOKIE_NAME = 'oauth_state'
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000

// Redirect the user back to the frontend with a small error code.
const redirectWithError = (res: Response, baseUrl: string, code: string) => {
  // Send a short code to the frontend instead of leaking provider details.
  const target = new URL(baseUrl)
  target.searchParams.set(OAUTH_ERROR_CODE_PARAM, code)
  res.redirect(target.toString())
}

// Ensure that OAuth is configured and the requested provider is enabled.
const assertConfiguredProvider = (providerParam: string) => {
  const oauthConfig = getOAuthConfig()

  // If OAuth is disabled or the requested provider differs from the configured one,
  // we fail before redirecting the user to any external provider.
  if (!oauthConfig || !oauthConfig.enabled) {
    throw new AppError(404, 'OAuth is not configured')
  }

  if (oauthConfig.provider !== providerParam) {
    throw new AppError(404, `OAuth provider '${providerParam}' is not enabled`)
  }

  return oauthConfig
}

// Generate a short-lived state token and bind it to the outgoing OAuth request.
const createOAuthState = (provider: string) => {
  return `${provider}:${randomBytes(32).toString('hex')}`
}

// Keep the state token in an httpOnly cookie so the callback can verify it later.
const setOAuthStateCookie = (res: Response, state: string) => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
  })
}

const clearOAuthStateCookie = (res: Response) => {
  // Clear with the same cookie attributes used on set, so browsers remove it reliably.
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

const readQueryString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : ''
}

const validateOAuthCallbackRequest = (req: Request, provider: string): string | null => {
  // Provider can return an error when the user denies consent.
  const providerError = readQueryString(req.query.error)
  if (providerError) {
    return 'oauth_provider_denied'
  }

  // OAuth state must match query and cookie to prevent CSRF and forged callbacks.
  const stateFromQuery = readQueryString(req.query.state)
  const stateFromCookie = typeof req.cookies?.[OAUTH_STATE_COOKIE_NAME] === 'string'
    ? req.cookies[OAUTH_STATE_COOKIE_NAME].trim()
    : ''

  if (!stateFromQuery || !stateFromCookie) {
    return 'oauth_state_missing'
  }

  // Prefix check binds the callback to the expected provider.
  if (!stateFromCookie.startsWith(`${provider}:`)) {
    return 'oauth_state_invalid'
  }

  if (stateFromQuery !== stateFromCookie) {
    return 'oauth_state_invalid'
  }

  return null
}

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

// OAuth login flow handlers. Passport handles the provider redirect and callback.
const oauthStartHandler = (req: Request, res: Response, next: (error?: unknown) => void) => {
  const oauthConfig = assertConfiguredProvider(req.params.provider)
  const oauthState = createOAuthState(oauthConfig.provider)

  setOAuthStateCookie(res, oauthState)

  // Start the OAuth handshake by sending the browser to the provider's consent page.
  // The generated state is attached to the outgoing request and verified later in the callback.
  passport.authenticate(oauthConfig.provider, {
    scope: ['user:email'],
    session: false,
    state: oauthState,
  })(req, res, next)
}

// OAuth callback handler after provider redirects back to our server.
const oauthCallbackHandler = (req: Request, res: Response, next: (error?: unknown) => void) => {
  const oauthConfig = assertConfiguredProvider(req.params.provider)

  // Reject early on provider errors or invalid state before exchanging auth data.
  const callbackValidationError = validateOAuthCallbackRequest(req, oauthConfig.provider)

  // Always clear state after callback to reduce replay risk.
  clearOAuthStateCookie(res)

  if (callbackValidationError) {
    redirectWithError(res, oauthConfig.errorRedirect, callbackValidationError)
    return
  }

  passport.authenticate(oauthConfig.provider, { session: false }, async (error: unknown, user?: NormalizedOAuthUser) => {
    try {
      if (error) {
        return next(error)
      }

      if (!user) {
        redirectWithError(res, oauthConfig.errorRedirect, 'oauth_user_not_found')
        return
      }

      if (!user.email) {
        redirectWithError(res, oauthConfig.errorRedirect, 'oauth_email_missing')
        return
      }

      // Keep the first OAuth pass simple: we only complete login when the email already exists locally.
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: publicUserSelect,
      })

      if (!existingUser) {
        redirectWithError(res, oauthConfig.errorRedirect, 'oauth_account_not_linked')
        return
      }

      // Reuse the same cookie + CSRF session model as password login.
      const csrfToken = generateCsrfToken()
      const token = signAuthToken(existingUser.id, existingUser.role, csrfToken)
      setAuthCookies(res, token, csrfToken)
      res.redirect(oauthConfig.successRedirect)
    } catch (callbackError) {
      next(callbackError)
    }
  })(req, res, next)
}

// Auth endpoints.
router.post('/register', handleAsyncErrors(registerHandler))
router.post('/login', handleAsyncErrors(loginHandler))
router.post('/logout', handleAsyncErrors(logoutHandler))
router.get('/me', handleAsyncErrors(meHandler))
router.get('/oauth/:provider', oauthStartHandler)
router.get('/oauth/:provider/callback', oauthCallbackHandler)

export default router
