import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import type { Profile } from 'passport-github2'
import { AppError } from '../middleware/error.middleware.js'
import { getOAuthConfig } from './oauth.config.js'

export interface NormalizedOAuthUser {
  provider: 'github' | 'google' | '42'
  providerId: string
  email: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

let strategyInitialized = false

const extractPrimaryEmail = (profile: Profile): string | null => {
  // GitHub profiles can expose multiple emails; we only need one stable login address.
  const email = profile.emails?.[0]?.value
  return typeof email === 'string' && email.trim().length > 0 ? email.toLowerCase() : null
}

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

const toNormalizedGithubUser = (profile: Profile): NormalizedOAuthUser => {
  return {
    provider: 'github',
    providerId: profile.id,
    email: extractPrimaryEmail(profile),
    username: profile.username ?? null,
    displayName: profile.displayName ?? profile.username ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  }
}

const toNormalizedGoogleUser = (profile: Profile): NormalizedOAuthUser => {
  return {
    provider: 'google',
    providerId: profile.id,
    email: extractPrimaryEmail(profile),
    username: profile.displayName ?? null,
    displayName: profile.displayName ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  }
}

const toNormalizedFortyTwoUser = (rawProfile: unknown): NormalizedOAuthUser => {
  const profile = rawProfile as Record<string, unknown>
  const userId = extractJsonField(profile, 'id') ?? extractJsonField(profile, 'login') ?? ''
  const email = extractJsonField(profile, 'email')
  const displayName = extractJsonField(profile, 'displayname') ?? extractJsonField(profile, 'usual_full_name')
  const username = extractJsonField(profile, 'login') ?? displayName
  const avatarUrl = extractJsonField(profile, 'image',) ?? extractJsonField(profile, 'image_url')

  return {
    provider: '42',
    providerId: userId,
    email,
    username,
    displayName,
    avatarUrl,
  }
}

const createFortyTwoStrategy = (clientId: string, clientSecret: string, callbackURL: string) => {
  // 42 uses standard OAuth2 endpoints, so we can reuse Passport's generic OAuth2 strategy.
  return new OAuth2Strategy(
    {
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: clientId,
      clientSecret,
      callbackURL,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      _params: unknown,
      profile: Profile,
      done: (error: Error | null, user?: Express.User | false) => void
    ) => {
      try {
        done(null, toNormalizedFortyTwoUser(profile) as unknown as Express.User)
      } catch (error) {
        done(error as Error)
      }
    }
  )
}

export const initializeOAuthStrategy = () => {
  const oauthConfig = getOAuthConfig()

  if (!oauthConfig) {
    return
  }

  if (strategyInitialized) {
    return
  }

  if (oauthConfig.provider === 'github') {
    // GitHub's strategy gives us a normalized profile object with username, email, and avatar.
    passport.use(
      new GitHubStrategy(
        {
          clientID: oauthConfig.clientId,
          clientSecret: oauthConfig.clientSecret,
          callbackURL: oauthConfig.callbackUrl,
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
  } else if (oauthConfig.provider === 'google') {
    // Google uses the same Passport pattern, only the provider package changes.
    passport.use(
      new GoogleStrategy(
        {
          clientID: oauthConfig.clientId,
          clientSecret: oauthConfig.clientSecret,
          callbackURL: oauthConfig.callbackUrl,
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
  } else if (oauthConfig.provider === '42') {
    // 42 still flows through Passport, but with the generic OAuth2 adapter above.
    passport.use(createFortyTwoStrategy(oauthConfig.clientId, oauthConfig.clientSecret, oauthConfig.callbackUrl))
  }

  strategyInitialized = true
}

export { passport }
