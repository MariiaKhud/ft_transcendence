import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomBytes } from 'crypto'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { revokeAuthTokenJti, signAuthToken, verifyAuthToken } from '../lib/auth.utils.js'
import type { NormalizedOAuthUser } from '../auth/oauth.passport.js'
import { initializeOAuthStrategy } from '../auth/oauth.passport.js'
import { getOAuthConfig, type OAuthProvider, type OAuthProviderConfig } from '../auth/oauth.config.js'
import { resolveOAuthUser } from '../services/oauth-account.service.js'
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
// Fallback codes used when callback payload is malformed or passport fails unexpectedly.
const OAUTH_CALLBACK_INVALID_CODE = 'oauth_callback_invalid'
const OAUTH_PROFILE_INVALID_CODE = 'oauth_profile_invalid'
const OAUTH_PROVIDER_UNAVAILABLE_CODE = 'oauth_provider_unavailable'
const OAUTH_REDIRECT_URI_MISMATCH_CODE = 'oauth_redirect_uri_mismatch'
const OAUTH_ACCESS_TOKEN_FAILED_CODE = 'oauth_access_token_failed'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const getOAuthCallbackErrorCode = (error: unknown) => {
  if (!isRecord(error)) {
    return OAUTH_CALLBACK_INVALID_CODE
  }

  const oauthError = isRecord(error.oauthError) ? error.oauthError : null
  const oauthDataRecord = isRecord(oauthError?.data) ? oauthError.data : null
  const oauthDataText = typeof oauthError?.data === 'string' ? oauthError.data.toLowerCase() : ''
  const errorDescription = typeof oauthDataRecord?.error_description === 'string'
    ? oauthDataRecord.error_description.toLowerCase()
    : ''
  const errorCode = typeof oauthDataRecord?.error === 'string' ? oauthDataRecord.error.toLowerCase() : ''
  const errorName = typeof error.name === 'string' ? error.name : ''
  const errorMessage = typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const combined = `${errorDescription} ${errorCode} ${errorMessage} ${oauthDataText}`.toLowerCase()

  if (
    combined.includes('redirect_uri') ||
    combined.includes('redirect uri') ||
    combined.includes('redirection uri') ||
    combined.includes('uri mismatch') ||
    combined.includes('callback url mismatch') ||
    combined.includes('redirect url mismatch') ||
    combined.includes('does not match the redirection uri')
  ) {
    return OAUTH_REDIRECT_URI_MISMATCH_CODE
  }

  if (errorName === 'TokenError') {
    if (
      combined.includes('invalid_client') ||
      combined.includes('invalid client') ||
      combined.includes('client_id') ||
      combined.includes('client id') ||
      combined.includes('unauthorized client') ||
      combined.includes('authorization code was used') ||
      combined.includes('code has already been used') ||
      combined.includes('failed to obtain access token') ||
      combined.includes('access token') ||
      combined.includes('invalid_grant') ||
      combined.includes('invalid grant') ||
      combined.includes('token exchange failed')
    ) {
      return OAUTH_ACCESS_TOKEN_FAILED_CODE
    }

    return OAUTH_ACCESS_TOKEN_FAILED_CODE
  }

  if (
    combined.includes('invalid_client') ||
    combined.includes('invalid client') ||
    combined.includes('client_id') ||
    combined.includes('client id') ||
    combined.includes('unauthorized client') ||
    combined.includes('authorization code was used') ||
    combined.includes('code has already been used') ||
    combined.includes('failed to obtain access token') ||
    combined.includes('access token') ||
    combined.includes('invalid_grant') ||
    combined.includes('invalid grant') ||
    combined.includes('token exchange failed')
  ) {
    return OAUTH_ACCESS_TOKEN_FAILED_CODE
  }

  return OAUTH_CALLBACK_INVALID_CODE
}

const getOAuthScopes = (provider: OAuthProvider) => {
  if (provider === 'github') {
    return ['user:email']
  }

  if (provider === 'google') {
    return ['profile', 'email']
  }

  // 42 API v2 accepts the public scope for basic user profile access.
  return ['public']
}

// Redirect the user back to the frontend with a small error code.
const redirectWithError = (res: Response, baseUrl: string, code: string) => {
  // Send a short code to the frontend instead of leaking provider details.
  const target = new URL(baseUrl)
  target.searchParams.set(OAUTH_ERROR_CODE_PARAM, code)
  res.redirect(target.toString())
}

const redirectOAuthFailure = (res: Response, baseUrl: string, code: string) => {
  // Clear any auth cookies so failed OAuth callbacks cannot leave partial session state.
  clearAuthCookies(res)
  // Keep frontend behavior consistent by always redirecting with a compact error code.
  redirectWithError(res, baseUrl, code)
}

// Ensure that OAuth is configured and the requested provider is enabled.
const assertConfiguredProvider = (providerParam: string) => {
  // Strategy initialization is idempotent; calling here makes OAuth resilient
  // even if startup happened before all env variables were available.
  initializeOAuthStrategy()

  const oauthConfig = getOAuthConfig()

  // If OAuth is disabled or the requested provider differs from the configured one,
  // we fail before redirecting the user to any external provider.
  if (!oauthConfig || !oauthConfig.enabled) {
    throw new AppError(404, ErrorCode.OAUTH_NOT_CONFIGURED, 'OAuth is not configured')
  }

  const provider = providerParam as OAuthProvider
  const providerConfig = oauthConfig.providers[provider] as OAuthProviderConfig | undefined

  if (!providerConfig) {
    throw new AppError(404, ErrorCode.OAUTH_PROVIDER_NOT_ENABLED, `OAuth provider '${providerParam}' is not enabled`)
  }

  return {
    ...oauthConfig,
    provider,
    providerConfig,
  }
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

const shouldRedirectToOAuthCanonicalOrigin = (req: Request, canonicalUrl: URL) => {
  return req.hostname !== canonicalUrl.hostname
}

const buildOAuthCanonicalStartUrl = (req: Request, canonicalUrl: URL) => {
  const target = new URL(req.originalUrl, canonicalUrl.origin)

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      target.searchParams.set(key, value)
    }
  }

  return target.toString()
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

const oauthProvidersHandler = (_req: Request, res: Response) => {
  const oauthConfig = getOAuthConfig()

  if (!oauthConfig?.enabled) {
    res.status(200).json({ success: true, data: [] })
    return
  }

  const providers = Object.keys(oauthConfig.providers)
  res.status(200).json({ success: true, data: providers })
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
    throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'Email already taken')
  }

  if (existingUsernameUser) {
    throw new AppError(409, ErrorCode.USERNAME_TAKEN, 'Username already taken')
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
      throw new AppError(409, ErrorCode.EMAIL_OR_USERNAME_TAKEN, 'Email or username already taken')
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
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password')
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
    const { csrfToken, jti } = verifyAuthToken(token)
    validateCsrfToken(req, csrfToken)
    revokeAuthTokenJti(jti)
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
    throw new AppError(401, ErrorCode.INVALID_SESSION, 'Invalid or expired session')
  }

  res.status(200).json({ success: true, data: user })
}

// OAuth login flow handlers. Passport handles the provider redirect and callback.
const oauthStartHandler = (req: Request, res: Response, next: (error?: unknown) => void) => {
  const oauthConfig = assertConfiguredProvider(req.params.provider)

  // OAuth callback URLs are host-bound at the provider level. If OAuth starts from a
  // different local host (e.g. 127.0.0.1), the state cookie won't be available on the
  // callback host and the flow fails with oauth_state_missing.
  const canonicalUrl = new URL(oauthConfig.successRedirect)
  if (shouldRedirectToOAuthCanonicalOrigin(req, canonicalUrl)) {
    res.redirect(buildOAuthCanonicalStartUrl(req, canonicalUrl))
    return
  }

  const oauthState = createOAuthState(oauthConfig.provider)

  setOAuthStateCookie(res, oauthState)

  // Start the OAuth handshake by sending the browser to the provider's consent page.
  // The generated state is attached to the outgoing request and verified later in the callback.
  try {
    const middleware = passport.authenticate(oauthConfig.provider, {
      scope: getOAuthScopes(oauthConfig.provider),
      session: false,
      state: oauthState,
    })

    middleware(req, res, (error?: unknown) => {
      if (error) {
        clearOAuthStateCookie(res)
        redirectOAuthFailure(res, oauthConfig.errorRedirect, OAUTH_PROVIDER_UNAVAILABLE_CODE)
        return
      }

      next()
    })
  } catch {
    clearOAuthStateCookie(res)
    redirectOAuthFailure(res, oauthConfig.errorRedirect, OAUTH_PROVIDER_UNAVAILABLE_CODE)
  }
}

// OAuth callback handler after provider redirects back to our server.
const oauthCallbackHandler = (req: Request, res: Response, next: (error?: unknown) => void) => {
  const oauthConfig = assertConfiguredProvider(req.params.provider)

  // Reject early on provider errors or invalid state before exchanging auth data.
  const callbackValidationError = validateOAuthCallbackRequest(req, oauthConfig.provider)

  // Always clear state after callback to reduce replay risk.
  clearOAuthStateCookie(res)

  if (callbackValidationError) {
    redirectOAuthFailure(res, oauthConfig.errorRedirect, callbackValidationError)
    return
  }

  try {
    const middleware = passport.authenticate(oauthConfig.provider, { session: false }, async (error: unknown, user?: NormalizedOAuthUser) => {
      try {
        if (error) {
          // Keep provider details out of browser responses but log server-side for debugging.
          console.error('[oauth] callback error', {
            provider: oauthConfig.provider,
            message: error instanceof Error ? error.message : String(error),
            raw: isRecord(error) ? {
              name: typeof error.name === 'string' ? error.name : undefined,
              oauthErrorData: isRecord(error.oauthError) || typeof error.oauthError === 'string'
                ? error.oauthError
                : undefined,
            } : undefined,
          })
          redirectOAuthFailure(res, oauthConfig.errorRedirect, getOAuthCallbackErrorCode(error))
          return
        }

        if (!user) {
          redirectOAuthFailure(res, oauthConfig.errorRedirect, 'oauth_user_not_found')
          return
        }

        // Resolve to a local user via linked provider account, verified email, or safe auto-create.
        const resolvedUser = await resolveOAuthUser(user)

        // Reuse the same cookie + CSRF session model as password login.
        const csrfToken = generateCsrfToken()
        const token = signAuthToken(resolvedUser.id, resolvedUser.role, csrfToken)
        setAuthCookies(res, token, csrfToken)
        res.redirect(oauthConfig.successRedirect)
      } catch (callbackError) {
        console.error('[oauth] post-auth error', {
          provider: oauthConfig.provider,
          message: callbackError instanceof Error ? callbackError.message : String(callbackError),
          statusCode: callbackError instanceof AppError ? callbackError.statusCode : undefined,
        })

        if (callbackError instanceof AppError && callbackError.statusCode === 409) {
          redirectOAuthFailure(res, oauthConfig.errorRedirect, 'oauth_account_conflict')
          return
        }

        if (callbackError instanceof AppError && callbackError.statusCode === 400) {
          redirectOAuthFailure(res, oauthConfig.errorRedirect, OAUTH_PROFILE_INVALID_CODE)
          return
        }

        // Reuse callback error classification to avoid generic messages when possible.
        redirectOAuthFailure(res, oauthConfig.errorRedirect, getOAuthCallbackErrorCode(callbackError))
      }
    })

    middleware(req, res, (error?: unknown) => {
      if (error) {
        redirectOAuthFailure(res, oauthConfig.errorRedirect, OAUTH_PROVIDER_UNAVAILABLE_CODE)
        return
      }

      next()
    })
  } catch {
    redirectOAuthFailure(res, oauthConfig.errorRedirect, OAUTH_PROVIDER_UNAVAILABLE_CODE)
  }
}

// Auth endpoints.
router.post('/register', handleAsyncErrors(registerHandler))
router.post('/login', handleAsyncErrors(loginHandler))
router.post('/logout', handleAsyncErrors(logoutHandler))
router.get('/me', handleAsyncErrors(meHandler))
router.get('/oauth/providers', oauthProvidersHandler)
router.get('/oauth/:provider', oauthStartHandler)
router.get('/oauth/:provider/callback', oauthCallbackHandler)

export default router
