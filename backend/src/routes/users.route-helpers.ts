// 1. Validates and shapes user profile data: usernames, search queries, edit-profile input, and avatar uploads (file type, size, filename)
// 2. Defines the exact fields (select) sent back for profiles, search results, and edited profiles, so users.routes.ts doesn't leak extra database fields

import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const MAX_DISPLAY_NAME_LENGTH = 50
const MAX_BIO_LENGTH = 500
const MAX_SEARCH_QUERY_LENGTH = 50
export const USER_SEARCH_RESULTS_LIMIT = 10
// Keep in sync with frontend/src/lib/i18n.ts's `supportedLanguages`.
const SUPPORTED_LANGUAGES = new Set(['en', 'nl', 'uk'])
const EDIT_PROFILE_ALLOWED_FIELDS = new Set(['displayName', 'bio', 'preferredLanguage'])
const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const CV_MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_CV_MIMES = new Set([
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const CV_MIME_TO_EXT: Record<string, string> = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export interface PublicBadge {
  id: string
  name: string
  icon: string
}

export interface PublicProfile {
  id: string
  displayName: string | null
  username: string
  avatarUrl: string | null
  cvUrl: string | null
  cvFilename: string | null
  bio: string | null
  isOnline: boolean
  lastSeenAt: Date | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicBadge[]
  level: number
  xp: number
}

export interface ProfileArticle {
  id: string
  title: string
  category: string
  likeCount: number
  createdAt: Date
}

export interface UserSearchResult {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface EditableProfile {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  cvUrl: string | null
  cvFilename: string | null
  bio: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  preferredLanguage: string | null
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface PublicProfileUserRecord {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  cvUrl: string | null
  cvFilename: string | null
  bio: string | null
  isOnline: boolean
  lastSeenAt: Date | null
  level: number
  xp: number
  userBadges: Array<{ badge: PublicBadge }>
  _count: {
    followers: number
    following: number
    articles: number
  }
}

// First check that body is an object.
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

// Keep `as const` so Prisma understands the exact selected fields.
export const publicProfileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  cvUrl: true,
  cvFilename: true,
  bio: true,
  isOnline: true,
  lastSeenAt: true,
  level: true,
  xp: true,
  userBadges: {
    select: {
      badge: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  },
  _count: {
    select: {
      followers: true,
      following: true,
      articles: {
        where: {
          isRemoved: false,
        },
      },
    },
  },
} as const

// Lighter shape for the profile page's article list (no content/author —
// the profile page already shows the author).
export const profileArticleSelect = {
  id: true,
  title: true,
  category: true,
  likeCount: true,
  createdAt: true,
} as const

// Fields we return for username search results.
export const userSearchResultSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

// Fields we return after profile update.
export const editableProfileSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  cvUrl: true,
  cvFilename: true,
  bio: true,
  role: true,
  preferredLanguage: true,
  xp: true,
  level: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export const validateUsernameParam = (usernameParam: string) => {
  const username = usernameParam.trim()

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(400, ErrorCode.VALIDATION_USERNAME_FORMAT, 'Validation failed: invalid username format')
  }

  return username
}

// Normalizes the `q` query param for GET /users/search. An empty/missing
// query is valid (callers should just return no results for it).
export const validateSearchQuery = (queryParam: unknown): string => {
  if (queryParam === undefined) {
    return ''
  }

  if (typeof queryParam !== 'string') {
    throw new AppError(400, ErrorCode.VALIDATION_SEARCH_QUERY_INVALID, 'Validation failed: q must be a string')
  }

  const trimmed = queryParam.trim()

  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new AppError(400, ErrorCode.VALIDATION_SEARCH_QUERY_MAX_LENGTH, `Validation failed: q must be at most ${MAX_SEARCH_QUERY_LENGTH} characters`)
  }

  return trimmed
}

export const validateEditProfileInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, ErrorCode.VALIDATION_PROFILE_FIELDS_REQUIRED, 'Validation failed: displayName and/or bio must be provided')
  }

  // Allow only displayName, bio, and preferredLanguage in PATCH.
  const unknownFields = Object.keys(body).filter((key) => !EDIT_PROFILE_ALLOWED_FIELDS.has(key))
  if (unknownFields.length > 0) {
    throw new AppError(400, ErrorCode.VALIDATION_PROFILE_UNKNOWN_FIELDS, `Validation failed: unknown field(s): ${unknownFields.join(', ')}`)
  }

  const hasDisplayName = Object.prototype.hasOwnProperty.call(body, 'displayName')
  const hasBio = Object.prototype.hasOwnProperty.call(body, 'bio')
  const hasPreferredLanguage = Object.prototype.hasOwnProperty.call(body, 'preferredLanguage')

  if (!hasDisplayName && !hasBio && !hasPreferredLanguage) {
    throw new AppError(400, ErrorCode.VALIDATION_PROFILE_FIELDS_REQUIRED, 'Validation failed: displayName and/or bio must be provided')
  }

  let displayName: string | null | undefined
  if (hasDisplayName) {
    if (body.displayName === null) {
      // null means: clear this field.
      displayName = null
    } else if (typeof body.displayName === 'string') {
      const trimmedDisplayName = body.displayName.trim()

      if (trimmedDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
        throw new AppError(400, ErrorCode.VALIDATION_DISPLAY_NAME_MAX_LENGTH, `Validation failed: displayName must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`)
      }

      displayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : null
    } else {
      throw new AppError(400, ErrorCode.VALIDATION_DISPLAY_NAME_INVALID, 'Validation failed: displayName must be a string or null')
    }
  }

  let bio: string | null | undefined
  if (hasBio) {
    if (body.bio === null) {
      // null means: clear this field.
      bio = null
    } else if (typeof body.bio === 'string') {
      const trimmedBio = body.bio.trim()

      if (trimmedBio.length > MAX_BIO_LENGTH) {
        throw new AppError(400, ErrorCode.VALIDATION_BIO_MAX_LENGTH, `Validation failed: bio must be at most ${MAX_BIO_LENGTH} characters`)
      }

      bio = trimmedBio.length > 0 ? trimmedBio : null
    } else {
      throw new AppError(400, ErrorCode.VALIDATION_BIO_INVALID, 'Validation failed: bio must be a string or null')
    }
  }

  let preferredLanguage: string | null | undefined
  if (hasPreferredLanguage) {
    if (body.preferredLanguage === null) {
      // null means: clear the preference and fall back to browser detection.
      preferredLanguage = null
    } else if (typeof body.preferredLanguage === 'string' && SUPPORTED_LANGUAGES.has(body.preferredLanguage)) {
      preferredLanguage = body.preferredLanguage
    } else {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_PREFERRED_LANGUAGE_INVALID,
        `Validation failed: preferredLanguage must be one of ${Array.from(SUPPORTED_LANGUAGES).join(', ')}, or null`,
      )
    }
  }

  return {
    displayName,
    bio,
    preferredLanguage,
  }
}

export const mapUserToPublicProfile = (user: PublicProfileUserRecord): PublicProfile => {
  // Build one clean API response object.
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    cvUrl: user.cvUrl,
    cvFilename: user.cvFilename,
    bio: user.bio,
    isOnline: user.isOnline,
    lastSeenAt: user.lastSeenAt,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    articleCount: user._count.articles,
    badges: user.userBadges.map((entry) => {
      return {
        id: entry.badge.id,
        name: entry.badge.name,
        icon: entry.badge.icon,
      }
    }),
    level: user.level,
    xp: user.xp,
  }
}

// Validate avatar file mimetype.
export const validateAvatarMimetype = (mimetype: string | undefined) => {
  if (!mimetype || !ALLOWED_AVATAR_MIMES.has(mimetype)) {
    throw new AppError(400, ErrorCode.VALIDATION_AVATAR_FORMAT, 'Validation failed: avatar must be jpg, png, or webp')
  }
}

export const validateCvMimetype = (mimetype: string | undefined) => {
  if (!mimetype || !ALLOWED_CV_MIMES.has(mimetype)) {
    throw new AppError(400, ErrorCode.VALIDATION_CV_FORMAT, 'Validation failed: CV must be txt, pdf, doc, or docx')
  }
}

// Get file extension from mimetype.
export const getAvatarExtension = (mimetype: string): string => {
  return AVATAR_MIME_TO_EXT[mimetype] || 'jpg'
}

// Get absolute path to uploads directory.
export const getUploadsDir = (): string => {
  return process.env.UPLOAD_PATH || './uploads'
}

// Generate avatar filename with UUID.
export const generateAvatarFilename = (mimetype: string): string => {
  const ext = getAvatarExtension(mimetype)
  return `${randomUUID()}.${ext}`
}

export const generateCvFilename = (mimetype: string): string => {
  return `${randomUUID()}.${CV_MIME_TO_EXT[mimetype] ?? 'txt'}`
}

// Delete old avatar file if it exists.
export const deleteOldAvatar = async (oldAvatarUrl: string | null) => {
  if (!oldAvatarUrl || !oldAvatarUrl.startsWith('/uploads/')) {
    return
  }

  try {
    const filename = oldAvatarUrl.replace('/uploads/', '')
    const filepath = `${getUploadsDir()}/${filename}`
    await fs.unlink(filepath)
  } catch (error) {
    // Ignore file not found errors; log others for debugging.
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return
    }
    console.error('Failed to delete old avatar:', error)
  }
}

export const deleteOldCv = async (oldCvUrl: string | null) => {
  if (!oldCvUrl || !oldCvUrl.startsWith('/uploads/')) {
    return
  }

  try {
    await fs.unlink(`${getUploadsDir()}/${oldCvUrl.replace('/uploads/', '')}`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return
    }
    console.error('Failed to delete old CV:', error)
  }
}
