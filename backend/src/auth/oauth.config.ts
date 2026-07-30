import { AppError } from '../middleware/error.middleware.js'

export type OAuthProvider = 'github' | 'google' | '42'

export interface OAuthConfig {
  enabled: boolean
  provider: OAuthProvider
  clientId: string
  clientSecret: string
  callbackUrl: string
  successRedirect: string
  errorRedirect: string
}

// Accept empty OAuth env in development so the backend can still start
// until the provider task is fully configured.
const asNonEmpty = (value: string | undefined) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
}

const isOAuthProvider = (value: string): value is OAuthProvider => {
  return value === 'github' || value === 'google' || value === '42'
}

const assertUrl = (value: string, fieldName: string) => {
  try {
    // Throws when value is not a valid absolute URL.
    new URL(value)
  } catch {
    throw new AppError(500, `Server misconfiguration: ${fieldName} must be a valid URL`)
  }
}

let cachedConfig: OAuthConfig | null = null

export const getOAuthConfig = (): OAuthConfig | null => {
  if (cachedConfig) {
    return cachedConfig
  }

  const providerRaw = asNonEmpty(process.env.OAUTH_PROVIDER)
  const clientId = asNonEmpty(process.env.OAUTH_CLIENT_ID)
  const clientSecret = asNonEmpty(process.env.OAUTH_CLIENT_SECRET)
  const callbackUrl = asNonEmpty(process.env.OAUTH_CALLBACK_URL)
  const successRedirect = asNonEmpty(process.env.OAUTH_SUCCESS_REDIRECT)
  const errorRedirect = asNonEmpty(process.env.OAUTH_ERROR_REDIRECT)

  const hasAnyOAuthEnv =
    providerRaw.length > 0 ||
    clientId.length > 0 ||
    clientSecret.length > 0 ||
    callbackUrl.length > 0 ||
    successRedirect.length > 0 ||
    errorRedirect.length > 0

  // If none of the OAuth variables are present, keep the feature disabled.
  if (!hasAnyOAuthEnv) {
    return null
  }

  if (!isOAuthProvider(providerRaw)) {
    throw new AppError(500, 'Server misconfiguration: OAUTH_PROVIDER must be one of github, google, 42')
  }

  if (!clientId || !clientSecret || !callbackUrl || !successRedirect || !errorRedirect) {
    throw new AppError(500, 'Server misconfiguration: OAuth environment variables are incomplete')
  }

  // Validate redirect targets early so startup fails before any login attempt.
  assertUrl(callbackUrl, 'OAUTH_CALLBACK_URL')
  assertUrl(successRedirect, 'OAUTH_SUCCESS_REDIRECT')
  assertUrl(errorRedirect, 'OAUTH_ERROR_REDIRECT')

  cachedConfig = {
    enabled: true,
    provider: providerRaw,
    clientId,
    clientSecret,
    callbackUrl,
    successRedirect,
    errorRedirect,
  }

  return cachedConfig
}
