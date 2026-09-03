// oauth.passport.ts → takes those settings and connects them to passport, which is then used in auth.routes.ts to handle /api/auth/oauth/:provider
// and /api/auth/oauth/:provider/callback

import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import type { Profile } from 'passport-github2'
import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { getOAuthConfig } from './oauth.config.js'

export interface NormalizedOAuthUser {
  provider: 'github' | 'google' | '42'
  providerId: string
  email: string | null
  providerUsername: string | null
  displayName: string | null
  avatarUrl: string | null
  emailVerified: boolean
}

// Flag to ensure we only initialize Passport strategies once.
let strategyInitialized = false

/// Extracts the primary email from a Passport profile object, returning null if none is found.
const extractPrimaryEmail = (profile: Profile): { email: string | null; verified: boolean } => {
  // GitHub profiles can expose multiple emails; we only need one stable login address.
  const emailEntry = profile.emails?.[0] as { value?: string; verified?: boolean } | undefined
  const email = emailEntry?.value

  return {
    email: typeof email === 'string' && email.trim().length > 0 ? email.toLowerCase() : null,
    verified: Boolean(emailEntry?.verified),
  }
}

// Extracts a field from a JSON-like object, returning null if the field is missing or not a string.
const extractJsonField = (value: unknown, fieldName: string): string | null => {
  // The 42 profile payload is JSON-like, so we read fields defensively.
  if (value && typeof value === 'object' && fieldName in value) {
    const fieldValue = (value as Record<string, unknown>)[fieldName]
    if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
      return fieldValue.trim()
    }
  }

  return null
}

// Converts a GitHub profile into a normalized user object for our app.
const toNormalizedGithubUser = (profile: Profile): NormalizedOAuthUser => {
  const { email, verified } = extractPrimaryEmail(profile)

  return {
    provider: 'github',
    providerId: profile.id,
    email,
    providerUsername: profile.username ?? null,
    displayName: profile.displayName ?? profile.username ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
    emailVerified: verified,
  }
}

// Converts a Google profile into a normalized user object for our app.
const toNormalizedGoogleUser = (profile: Profile): NormalizedOAuthUser => {
  const { email, verified } = extractPrimaryEmail(profile)

  return {
    provider: 'google',
    providerId: profile.id,
    email,
    providerUsername: profile.displayName ?? null,
    displayName: profile.displayName ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
    emailVerified: verified,
  }
}

// Converts a 42 profile into a normalized user object for our app.
const toNormalizedFortyTwoUser = (rawProfile: unknown): NormalizedOAuthUser => {
  const profile = rawProfile as Record<string, unknown>
  const userIdValue = profile.id
  const userId =
    (typeof userIdValue === 'string' && userIdValue.trim().length > 0
      ? userIdValue.trim()
      : typeof userIdValue === 'number'
        ? String(userIdValue)
        : null) ??
    extractJsonField(profile, 'login') ??
    ''
  const email = extractJsonField(profile, 'email')
  const displayName = extractJsonField(profile, 'displayname') ?? extractJsonField(profile, 'usual_full_name')
  const providerUsername = extractJsonField(profile, 'login') ?? displayName
  const imageValue = profile.image
  const imageLink =
    imageValue && typeof imageValue === 'object'
      ? extractJsonField(imageValue as Record<string, unknown>, 'link')
      : null
  const avatarUrl = imageLink ?? extractJsonField(profile, 'image_url')

  return {
    provider: '42',
    providerId: userId,
    email,
    providerUsername,
    displayName,
    avatarUrl,
    emailVerified: false,
  }
}

// Creates a Passport strategy for 42 using the generic OAuth2 adapter.
const createFortyTwoStrategy = (clientId: string, clientSecret: string, callbackURL: string) => {
  // 42 uses standard OAuth2 endpoints, so we can reuse Passport's generic OAuth2 strategy.
  const strategy = new OAuth2Strategy(
    {
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: clientId,
      clientSecret,
      callbackURL,
    },
    async (
      accessToken: string,
      _refreshToken: string,
      profile: unknown,
      done: (error: Error | null, user?: Express.User | false) => void
    ) => {
      try {
        // Ensure callback always receives normalized user data.
        done(null, toNormalizedFortyTwoUser(profile) as unknown as Express.User)
      } catch (error) {
        done(error as Error)
      }
    }
  )

  // Passport's generic OAuth2 strategy does not know provider-specific profile endpoints,
  // so we fetch /v2/me manually to obtain login/email/avatar fields.
  ;(strategy as OAuth2Strategy & {
    userProfile: (
      accessToken: string,
      done: (error: Error | null, profile?: unknown) => void
    ) => void
    _oauth2: {
      get: (
        url: string,
        accessToken: string,
        callback: (error: Error | null, body?: string) => void
      ) => void
    }
  }).userProfile = (token, done) => {
    ;(strategy as OAuth2Strategy & {
      _oauth2: {
        get: (
          url: string,
          accessToken: string,
          callback: (error: Error | null, body?: string) => void
        ) => void
      }
    })._oauth2.get('https://api.intra.42.fr/v2/me', token, (error, body) => {
      if (error) {
        done(error instanceof Error ? error : new Error('Failed to load 42 profile'))
        return
      }

      try {
        const payload = typeof body === 'string' ? body : body?.toString('utf-8') ?? '{}'
        const profile = JSON.parse(payload) as unknown
        done(null, profile)
      } catch {
        done(new AppError(400, ErrorCode.OAUTH_PROFILE_INVALID_PAYLOAD, 'Invalid 42 profile payload'))
      }
    })
  }

  return strategy
}

// Initializes Passport strategies for all configured OAuth providers.
export const initializeOAuthStrategy = () => {
  const oauthConfig = getOAuthConfig()

  if (!oauthConfig) {
    return
  }

  if (strategyInitialized) {
    return
  }

  if (oauthConfig.providers.github) {
    const providerConfig = oauthConfig.providers.github

    // GitHub's strategy gives us a normalized profile object with username, email, and avatar.
    passport.use(
      new GitHubStrategy(
        {
          clientID: providerConfig.clientId,
          clientSecret: providerConfig.clientSecret,
          callbackURL: providerConfig.callbackUrl,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: (error: Error | null, user?: NormalizedOAuthUser) => void
        ) => {
          try {
            // Normalize the provider payload into a small app-owned shape.
            const normalized = toNormalizedGithubUser(profile)
            done(null, normalized)
          } catch (error) {
            done(error as Error)
          }
        }
      )
    )
  }

  if (oauthConfig.providers.google) {
    const providerConfig = oauthConfig.providers.google

    // Google uses the same Passport pattern, only the provider package changes.
    passport.use(
      new GoogleStrategy(
        {
          clientID: providerConfig.clientId,
          clientSecret: providerConfig.clientSecret,
          callbackURL: providerConfig.callbackUrl,
          passReqToCallback: false,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: (error: Error | null, user?: Express.User | false) => void
        ) => {
          try {
            // Normalize the provider payload into a small app-owned shape.
            const normalized = toNormalizedGoogleUser(profile)
            done(null, normalized as unknown as Express.User)
          } catch (error) {
            done(error as Error)
          }
        }
      )
    )
  }

  if (oauthConfig.providers['42']) {
    const providerConfig = oauthConfig.providers['42']

    // 42 still flows through Passport, but with the generic OAuth2 adapter above.
    passport.use('42', createFortyTwoStrategy(providerConfig.clientId, providerConfig.clientSecret, providerConfig.callbackUrl))
  }

  strategyInitialized = true
}

export { passport }
