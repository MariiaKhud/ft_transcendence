// oauth.config.ts → prepares the settings (keys, secrets, URLs)

import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'

export type OAuthProvider = 'github' | 'google' | '42'

export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  callbackUrl: string
}

export interface OAuthConfig {
  enabled: boolean
  providers: Partial<Record<OAuthProvider, OAuthProviderConfig>>
  successRedirect: string
  errorRedirect: string
}

// Helper to treat empty strings as missing values.
const asNonEmpty = (value: string | undefined) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
}

// Check that value is a valid OAuth provider.
const isOAuthProvider = (value: string): value is OAuthProvider => {
  return value === 'github' || value === 'google' || value === '42'
}

// Check that value is a valid absolute URL.
const assertUrl = (value: string, fieldName: string) => {
  try {
    // Throws when value is not a valid absolute URL.
    new URL(value)
  } catch {
    throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, `Server misconfiguration: ${fieldName} must be a valid URL`)
  }
}

// Get the env variable prefix for a given provider, e.g. "OAUTH_GITHUB" or "OAUTH_42".
const providerEnvPrefix = (provider: OAuthProvider) => {
  if (provider === '42') {
    return 'OAUTH_42'
  }

  return `OAUTH_${provider.toUpperCase()}`
}

// Read provider config from env variables, returning null if none are set.
const readProviderConfig = (provider: OAuthProvider): OAuthProviderConfig | null => {
  const prefix = providerEnvPrefix(provider)
  const clientId = asNonEmpty(process.env[`${prefix}_CLIENT_ID`])
  const clientSecret = asNonEmpty(process.env[`${prefix}_CLIENT_SECRET`])
  const callbackUrl = asNonEmpty(process.env[`${prefix}_CALLBACK_URL`])

  const hasAny = clientId.length > 0 || clientSecret.length > 0 || callbackUrl.length > 0
  if (!hasAny) {
    return null
  }

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, `Server misconfiguration: ${prefix}_* variables are incomplete`)
  }

  assertUrl(callbackUrl, `${prefix}_CALLBACK_URL`)

  return {
    clientId,
    clientSecret,
    callbackUrl,
  }
}

// Cache the config so we don't read env variables on every request.
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

  const providers: Partial<Record<OAuthProvider, OAuthProviderConfig>> = {}

  const githubConfig = readProviderConfig('github')
  if (githubConfig) {
    providers.github = githubConfig
  }

  const googleConfig = readProviderConfig('google')
  if (googleConfig) {
    providers.google = googleConfig
  }

  const fortyTwoConfig = readProviderConfig('42')
  if (fortyTwoConfig) {
    providers['42'] = fortyTwoConfig
  }

  const hasAnyOAuthEnv =
    providerRaw.length > 0 ||
    clientId.length > 0 ||
    clientSecret.length > 0 ||
    callbackUrl.length > 0 ||
    successRedirect.length > 0 ||
    errorRedirect.length > 0 ||
    Boolean(githubConfig) ||
    Boolean(googleConfig) ||
    Boolean(fortyTwoConfig)

  // If none of the OAuth variables are present, keep the feature disabled.
  if (!hasAnyOAuthEnv) {
    return null
  }

  // If any of the OAuth variables are present, validate them and enable the feature.
  if (providerRaw || clientId || clientSecret || callbackUrl) {
    if (!isOAuthProvider(providerRaw)) {
      throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, 'Server misconfiguration: OAUTH_PROVIDER must be one of github, google, 42')
    }

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, 'Server misconfiguration: OAuth environment variables are incomplete')
    }

    assertUrl(callbackUrl, 'OAUTH_CALLBACK_URL')
    providers[providerRaw] = {
      clientId,
      clientSecret,
      callbackUrl,
    }
  }

  if (!successRedirect || !errorRedirect) {
    throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, 'Server misconfiguration: OAUTH_SUCCESS_REDIRECT and OAUTH_ERROR_REDIRECT are required')
  }

  if (Object.keys(providers).length === 0) {
    throw new AppError(500, ErrorCode.SERVER_MISCONFIGURED, 'Server misconfiguration: No OAuth providers are configured')
  }

  // Validate that the redirect URLs are valid absolute URLs.
  assertUrl(successRedirect, 'OAUTH_SUCCESS_REDIRECT')
  assertUrl(errorRedirect, 'OAUTH_ERROR_REDIRECT')

  cachedConfig = {
    enabled: true,
    providers,
    successRedirect,
    errorRedirect,
  }

  return cachedConfig
}
