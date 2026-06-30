import { AppError } from '../middleware/error.middleware.js'
import type { Category } from '@prisma/client'

const TITLE_MAX_LENGTH = 120
const CONTENT_MIN_LENGTH = 100
const VALID_CATEGORIES = new Set<string>([
  'PROGRAMMING',
  'CAREER',
  'STUDY_NOTES',
  'PROJECTS',
  'LIFE',
  'OPINION',
])

// XP awarded to the author each time they publish a new article.
export const XP_REWARD_CREATE_ARTICLE = 25

export interface CreateArticleInput {
  title: string
  content: string
  category: Category
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const validateCreateArticleInput = (body: unknown): CreateArticleInput => {
  if (!isRecord(body)) {
    throw new AppError(400, 'Validation failed: title, content, and category are required')
  }

  const { title, content, category } = body

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new AppError(400, 'Validation failed: title is required')
  }

  const trimmedTitle = title.trim()
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new AppError(400, `Validation failed: title must be at most ${TITLE_MAX_LENGTH} characters`)
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AppError(400, 'Validation failed: content is required')
  }

  const trimmedContent = content.trim()
  if (trimmedContent.length < CONTENT_MIN_LENGTH) {
    throw new AppError(400, `Validation failed: content must be at least ${CONTENT_MIN_LENGTH} characters`)
  }

  if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) {
    throw new AppError(400, `Validation failed: category must be one of ${Array.from(VALID_CATEGORIES).join(', ')}`)
  }

  return {
    title: trimmedTitle,
    content: trimmedContent,
    category: category as Category,
  }
}

// Every 100 XP earns one level, starting at level 1.
export const calculateLevelForXp = (xp: number): number => {
  return Math.floor(xp / 100) + 1
}

// Keep `as const` so Prisma understands the exact selected fields.
export const articleWithAuthorSelect = {
  id: true,
  authorId: true,
  title: true,
  content: true,
  category: true,
  likeCount: true,
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

// Lighter shape for list views (no content — keeps the feed payload small).
export const articleSummarySelect = {
  id: true,
  title: true,
  category: true,
  likeCount: true,
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

// Single-article view: full article plus how many comments it has.
export const articleDetailSelect = {
  ...articleWithAuthorSelect,
  _count: {
    select: {
      comments: {
        where: { isRemoved: false },
      },
    },
  },
} as const

interface ArticleWithCommentCount {
  _count: { comments: number }
  [key: string]: unknown
}

// Flatten Prisma's `_count.comments` into a plain `commentsCount` field for the API response.
export const mapArticleToDetails = (article: ArticleWithCommentCount) => {
  const { _count, ...rest } = article
  return { ...rest, commentsCount: _count.comments }
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

export interface ListArticlesQuery {
  page: number
  pageSize: number
}

// Read ?page=&pageSize= from the URL, with safe defaults and limits.
export const parsePaginationQuery = (query: unknown): ListArticlesQuery => {
  const record = isRecord(query) ? query : {}

  const rawPage = Number(record.page)
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const rawPageSize = Number(record.pageSize)
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  return { page, pageSize }
}
