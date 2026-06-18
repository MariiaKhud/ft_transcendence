import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { AppError } from '../middleware/error.middleware.js'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const MAX_DISPLAY_NAME_LENGTH = 50
const MAX_BIO_LENGTH = 500
const EDIT_PROFILE_ALLOWED_FIELDS = new Set(['displayName', 'bio'])
const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface PublicBadge {
  id: string
  name: string
  icon: string
}

export interface PublicProfile {
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicBadge[]
  level: number
  xp: number
}

export interface EditableProfile {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface PublicProfileUserRecord {
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
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
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
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

// Fields we return after profile update.
export const editableProfileSelect = {
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
} as const

export const validateUsernameParam = (usernameParam: string) => {
  const username = usernameParam.trim()

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(400, 'Validation failed: invalid username format')
  }

  return username
}

export const validateEditProfileInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, 'Validation failed: displayName and/or bio must be provided')
  }

  // Allow only displayName and bio in PATCH.
  const unknownFields = Object.keys(body).filter((key) => !EDIT_PROFILE_ALLOWED_FIELDS.has(key))
  if (unknownFields.length > 0) {
    throw new AppError(400, `Validation failed: unknown field(s): ${unknownFields.join(', ')}`)
  }

  const hasDisplayName = Object.prototype.hasOwnProperty.call(body, 'displayName')
  const hasBio = Object.prototype.hasOwnProperty.call(body, 'bio')

  if (!hasDisplayName && !hasBio) {
    throw new AppError(400, 'Validation failed: displayName and/or bio must be provided')
  }

  let displayName: string | null | undefined
  if (hasDisplayName) {
    if (body.displayName === null) {
      // null means: clear this field.
      displayName = null
    } else if (typeof body.displayName === 'string') {
      const trimmedDisplayName = body.displayName.trim()

      if (trimmedDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
        throw new AppError(400, `Validation failed: displayName must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`)
      }

      displayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : null
    } else {
      throw new AppError(400, 'Validation failed: displayName must be a string or null')
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
        throw new AppError(400, `Validation failed: bio must be at most ${MAX_BIO_LENGTH} characters`)
      }

      bio = trimmedBio.length > 0 ? trimmedBio : null
    } else {
      throw new AppError(400, 'Validation failed: bio must be a string or null')
    }
  }

  return {
    displayName,
    bio,
  }
}

export const mapUserToPublicProfile = (user: PublicProfileUserRecord): PublicProfile => {
  // Build one clean API response object.
  return {
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
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
    throw new AppError(400, 'Validation failed: avatar must be jpg, png, or webp')
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
