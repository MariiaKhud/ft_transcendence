import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'

const CONTENT_MIN_LENGTH = 1
const CONTENT_MAX_LENGTH = 1000
const REMOVE_REASON_MAX_LENGTH = 500

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export interface CreateCommentInput {
  content: string
}

export const validateCreateCommentInput = (body: unknown): CreateCommentInput => {
  if (!isRecord(body)) {
    throw new AppError(400, ErrorCode.VALIDATION_COMMENT_CONTENT_REQUIRED, 'Validation failed: content is required')
  }

  const { content } = body

  if (typeof content !== 'string' || content.trim().length < CONTENT_MIN_LENGTH) {
    throw new AppError(400, ErrorCode.VALIDATION_COMMENT_CONTENT_REQUIRED, 'Validation failed: content is required')
  }

  const trimmedContent = content.trim()
  if (trimmedContent.length > CONTENT_MAX_LENGTH) {
    throw new AppError(400, ErrorCode.VALIDATION_COMMENT_CONTENT_MAX_LENGTH, `Validation failed: content must be at most ${CONTENT_MAX_LENGTH} characters`)
  }

  return { content: trimmedContent }
}

export interface RemoveCommentInput {
  reason: string
}

// Moderator/admin soft-removal requires a reason (1-500 chars).
export const validateRemoveCommentInput = (body: unknown): RemoveCommentInput => {
  if (!isRecord(body)) {
    throw new AppError(400, ErrorCode.VALIDATION_REMOVE_REASON_REQUIRED, 'Validation failed: reason is required')
  }

  const { reason } = body

  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new AppError(400, ErrorCode.VALIDATION_REMOVE_REASON_REQUIRED, 'Validation failed: reason is required')
  }

  const trimmedReason = reason.trim()
  if (trimmedReason.length > REMOVE_REASON_MAX_LENGTH) {
    throw new AppError(400, ErrorCode.VALIDATION_REMOVE_REASON_MAX_LENGTH, `Validation failed: reason must be at most ${REMOVE_REASON_MAX_LENGTH} characters`)
  }

  return { reason: trimmedReason }
}

// Keep `as const` so Prisma understands the exact selected fields.
export const commentWithAuthorSelect = {
  id: true,
  articleId: true,
  authorId: true,
  content: true,
  isRemoved: true,
  removedReason: true,
  removedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      level: true,
    },
  },
} as const
