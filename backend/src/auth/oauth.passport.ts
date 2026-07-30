import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import type { Profile } from 'passport-github2'
import { AppError } from '../middleware/error.middleware.js'
import { getOAuthConfig } from './oauth.config.js'

export interface NormalizedOAuthUser {
  provider: 'github'
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

export const initializeOAuthStrategy = () => {
  const oauthConfig = getOAuthConfig()

  if (!oauthConfig) {
    return
  }

  if (strategyInitialized) {
    return
  }

  if (oauthConfig.provider !== 'github') {
    // We only wire GitHub in this sprint; other providers stay config-only for now.
    throw new AppError(500, `OAuth provider '${oauthConfig.provider}' is configured but not wired yet`)
  }

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

  strategyInitialized = true
}

export { passport }
