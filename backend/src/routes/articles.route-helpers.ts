import type { Prisma } from '@prisma/client'

/**
 * Query parameters for GET /api/articles
 */
export interface ArticlesQueryParams {
  page?: number | string
  limit?: number | string
  category?: string
  sort?: 'newest' | 'oldest' | 'most_liked'
  search?: string
}

/**
 * Validates and normalizes articles query parameters.
 * @param query Raw query object from request
 * @returns Normalized query params with defaults
 */
export const validateArticlesQuery = (query: Record<string, any>) => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10) || 20))
  const category = query.category ? String(query.category).toUpperCase() : undefined
  const sort = (query.sort as string)?.toLowerCase() || 'newest'
  const search = query.search ? String(query.search).trim() : undefined

  // Validate sort
  if (!['newest', 'oldest', 'most_liked'].includes(sort)) {
    throw new Error('Invalid sort parameter: must be newest, oldest, or most_liked')
  }

  return { page, limit, category, sort, search }
}

/**
 * Builds Prisma query filter for articles.
 * @param category Optional category filter
 * @param search Optional search filter
 * @returns Prisma where clause
 */
export const buildArticlesFilter = (
  category?: string,
  search?: string
): Prisma.ArticleWhereInput => {
  const where: Prisma.ArticleWhereInput = {
    isRemoved: false, // Exclude soft-deleted articles
  }

  if (category) {
    where.category = category as any
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ]
  }

  return where
}

/**
 * Builds Prisma order by clause for articles.
 * @param sort Sort order (newest, oldest, most_liked)
 * @returns Prisma orderBy clause
 */
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

/**
 * Select clause for articles with author info.
 */
export const articleWithAuthorSelect: Prisma.ArticleSelect = {
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
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
}

