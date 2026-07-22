import { AppError } from '../middleware/error.middleware.js'
import type { Category, Prisma } from '@prisma/client'

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

export interface UpdateArticleInput {
  title?: string
  content?: string
  category?: Category
}

// Partial update: only validates fields that are present, but requires at least one.
export const validateUpdateArticleInput = (body: unknown): UpdateArticleInput => {
  if (!isRecord(body)) {
    throw new AppError(400, 'Validation failed: at least one of title, content, category is required')
  }

  const { title, content, category } = body
  const result: UpdateArticleInput = {}

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError(400, 'Validation failed: title must be a non-empty string')
    }

    const trimmedTitle = title.trim()
    if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      throw new AppError(400, `Validation failed: title must be at most ${TITLE_MAX_LENGTH} characters`)
    }

    result.title = trimmedTitle
  }

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError(400, 'Validation failed: content must be a non-empty string')
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < CONTENT_MIN_LENGTH) {
      throw new AppError(400, `Validation failed: content must be at least ${CONTENT_MIN_LENGTH} characters`)
    }

    result.content = trimmedContent
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) {
      throw new AppError(400, `Validation failed: category must be one of ${Array.from(VALID_CATEGORIES).join(', ')}`)
    }

    result.category = category as Category
  }

  if (Object.keys(result).length === 0) {
    throw new AppError(400, 'Validation failed: at least one of title, content, category is required')
  }

  return result
}

// Every 100 XP earns one level, starting at level 1.
export const calculateLevelForXp = (xp: number): number => {
  return Math.floor(xp / 100) + 1
}

export interface ArticlesQueryParams {
  page?: number | string
  limit?: number | string
  category?: string
  sort?: 'newest' | 'oldest' | 'most_liked'
  search?: string
  title?: string
  author?: string
  content?: string
  postedFrom?: string
  postedTo?: string
}

const parseDateParam = (value: unknown, label: string): Date | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} parameter: must be a valid date`)
  }

  return date
}

export const validateArticlesQuery = (query: Record<string, any>) => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10) || 20))
  const category = query.category ? String(query.category).toUpperCase() : undefined
  const sort = (query.sort as string)?.toLowerCase() || 'newest'
  const search = query.search ? String(query.search).trim() : undefined
  const title = query.title ? String(query.title).trim() : undefined
  const author = query.author ? String(query.author).trim() : undefined
  const content = query.content ? String(query.content).trim() : undefined

  if (!['newest', 'oldest', 'most_liked'].includes(sort)) {
    throw new Error('Invalid sort parameter: must be newest, oldest, or most_liked')
  }

  const postedFrom = parseDateParam(query.postedFrom, 'postedFrom')
  const postedTo = parseDateParam(query.postedTo, 'postedTo')

  return { page, limit, category, sort, search, title, author, content, postedFrom, postedTo }
}

export interface ArticlesFilterInput {
  category?: string
  search?: string
  title?: string
  author?: string
  content?: string
  postedFrom?: Date
  postedTo?: Date
}

// `search` matches anything (title/content/author); the field-specific
// filters are ANDed on top of it for the advanced search form.
export const buildArticlesFilter = ({
  category,
  search,
  title,
  author,
  content,
  postedFrom,
  postedTo,
}: ArticlesFilterInput): Prisma.ArticleWhereInput => {
  const where: Prisma.ArticleWhereInput = {
    isRemoved: false,
  }

  if (category) {
    where.category = category as any
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { author: { username: { contains: search, mode: 'insensitive' } } },
    ]
  }

  if (title) {
    where.title = { contains: title, mode: 'insensitive' }
  }

  if (author) {
    where.author = { username: { contains: author, mode: 'insensitive' } }
  }

  if (content) {
    where.content = { contains: content, mode: 'insensitive' }
  }

  if (postedFrom || postedTo) {
    where.createdAt = {
      ...(postedFrom ? { gte: postedFrom } : {}),
      ...(postedTo ? { lte: postedTo } : {}),
    }
  }

  return where
}

export const buildArticlesOrderBy = (
  sort: string
): Prisma.ArticleOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }]
    case 'most_liked':
      return [{ likeCount: 'desc' }, { createdAt: 'desc' }]
    case 'newest':
    default:
      return [{ createdAt: 'desc' }]
  }
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

// Lighter shape for list views (no mod fields — keeps the feed payload small).
export const articleSummarySelect = {
  id: true,
  title: true,
  content: true,
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
  _count: {
    select: {
      comments: {
        where: { isRemoved: false },
      },
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
