import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { publicUserSelect } from '../routes/auth.routes-helpers.js'
import { generateAvatarFilename, getUploadsDir } from '../routes/users.route-helpers.js'
import type { NormalizedOAuthUser } from '../auth/oauth.passport.js'

type PublicUser = {
  [K in keyof typeof publicUserSelect]: (typeof publicUserSelect)[K] extends true ? unknown : never
}

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 20

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isPrismaUniqueConstraintError = (error: unknown) => {
  return isRecord(error) && error.code === 'P2002'
}

const normalizeEmail = (email: string | null | undefined) => {
  if (typeof email !== 'string') {
    return null
  }

  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

const sanitizeUsername = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const trimUsername = (value: string) => {
  if (value.length <= USERNAME_MAX_LENGTH) {
    return value
  }

  return value.slice(0, USERNAME_MAX_LENGTH).replace(/_+$/g, '') || value.slice(0, USERNAME_MAX_LENGTH)
}

const getDisplaySeed = (profile: NormalizedOAuthUser) => {
  const email = normalizeEmail(profile.email)
  const emailLocalPart = email ? email.split('@')[0] : ''

  return (
    profile.providerUsername ??
    profile.displayName ??
    emailLocalPart ??
    `oauth_${profile.provider}`
  )
}

const buildUsernameCandidate = (profile: NormalizedOAuthUser, suffix: string) => {
  // Build a short, safe username from provider data and trim it to the app limit.
  const base = sanitizeUsername(getDisplaySeed(profile)) || `oauth_${profile.provider}`
  const reservedLength = suffix.length
  const availableLength = Math.max(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH - reservedLength)
  return trimUsername(base.slice(0, availableLength) + suffix)
}

const generateSyntheticEmail = (profile: NormalizedOAuthUser) => {
  // OAuth-only accounts still need a unique email for the local user table.
  const providerPart = sanitizeUsername(profile.provider)
  const providerIdPart = sanitizeUsername(profile.providerId) || randomBytes(4).toString('hex')
  return `${providerPart}-${providerIdPart}@oauth.local`
}

const generatePasswordHash = async () => {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10)
}

const downloadOAuthAvatar = async (avatarUrl: string | null) => {
  if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) {
    return null
  }

  try {
    const response = await fetch(avatarUrl, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (!contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      return null
    }

    const filename = generateAvatarFilename(contentType)
    await fs.mkdir(getUploadsDir(), { recursive: true })
    await fs.writeFile(`${getUploadsDir()}/${filename}`, buffer)
    return `/uploads/${filename}`
  } catch {
    return null
  }
}

const createUniqueUsername = async (provider: NormalizedOAuthUser) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${attempt}`
    const candidate = buildUsernameCandidate(provider, suffix)

    if (candidate.length < USERNAME_MIN_LENGTH) {
      continue
    }

    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }
  }

  return trimUsername(`${sanitizeUsername(getDisplaySeed(provider)) || `oauth_${provider.provider}`}_${randomBytes(3).toString('hex')}`)
}

export const resolveOAuthUser = async (profile: NormalizedOAuthUser) => {
  if (!profile.providerId) {
    throw new AppError(400, ErrorCode.OAUTH_PROFILE_MISSING_PROVIDER_ID, 'OAuth profile is missing a provider identifier')
  }

  const normalizedEmail = normalizeEmail(profile.email)
  const localAvatarUrl = await downloadOAuthAvatar(profile.avatarUrl)

  try {
    return await prisma.$transaction(async (tx) => {
      // 1) Prefer an existing link for the same provider account.
      const linkedAccount = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider: profile.provider,
            providerId: profile.providerId,
          },
        },
        include: {
          user: {
            select: publicUserSelect,
          },
        },
      })

      if (linkedAccount?.user) {
        if (profile.avatarUrl && !linkedAccount.user.avatarUrl?.startsWith('/uploads/')) {
          return tx.user.update({
            where: { id: linkedAccount.user.id },
            data: { avatarUrl: localAvatarUrl },
            select: publicUserSelect,
          })
        }

        return linkedAccount.user
      }

      // 2) If the provider can prove the email is verified, match by local email.
      if (normalizedEmail && profile.emailVerified) {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: publicUserSelect,
        })

        if (existingUser) {
          const oauthAccount = await tx.oAuthAccount.upsert({
            where: {
              provider_providerId: {
                provider: profile.provider,
                providerId: profile.providerId,
              },
            },
            update: {},
            create: {
              provider: profile.provider,
              providerId: profile.providerId,
              userId: existingUser.id,
              emailAtLinkTime: normalizedEmail,
            },
            select: {
              userId: true,
            },
          })

          if (oauthAccount.userId !== existingUser.id) {
            throw new AppError(409, ErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED, 'OAuth account is already linked to another user')
          }

          if (profile.avatarUrl && !existingUser.avatarUrl?.startsWith('/uploads/')) {
            return tx.user.update({
              where: { id: existingUser.id },
              data: { avatarUrl: localAvatarUrl },
              select: publicUserSelect,
            })
          }

          return existingUser
        }
      }

      // 3) Otherwise create a fresh local account with safe defaults.
      const emailToUse = normalizedEmail && profile.emailVerified ? normalizedEmail : generateSyntheticEmail(profile)
      const username = await createUniqueUsername(profile)
      const passwordHash = await generatePasswordHash()
      const displayName = profile.displayName ?? profile.providerUsername ?? emailToUse.split('@')[0]

      // Create the user first, then persist the provider link in the same transaction.
      const user = await tx.user.create({
        data: {
          email: emailToUse,
          username,
          passwordHash,
          displayName,
          avatarUrl: localAvatarUrl ?? undefined,
        },
        select: publicUserSelect,
      })

      // Store the provider identity so future logins resolve to this same user.
      const oauthAccount = await tx.oAuthAccount.upsert({
        where: {
          provider_providerId: {
            provider: profile.provider,
            providerId: profile.providerId,
          },
        },
        update: {},
        create: {
          provider: profile.provider,
          providerId: profile.providerId,
          userId: user.id,
          emailAtLinkTime: normalizedEmail ?? user.email,
        },
        select: {
          userId: true,
        },
      })

      if (oauthAccount.userId !== user.id) {
        throw new AppError(409, ErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED, 'OAuth account is already linked to another user')
      }

      return user
    })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(409, ErrorCode.OAUTH_ACCOUNT_LINK_DUPLICATE, 'OAuth account could not be linked due to a duplicate account')
    }

    throw error
  }
}