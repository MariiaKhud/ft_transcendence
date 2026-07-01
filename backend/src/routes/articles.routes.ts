import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import {
  validateArticlesQuery,
  buildArticlesFilter,
  buildArticlesOrderBy,
  articleWithAuthorSelect,
} from './articles.route-helpers.js'

// Router for all articles endpoints.
const router = Router()

/**
 * GET /api/articles
 * Returns paginated articles with filtering and sorting.
 * Public route (no auth required).
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - category: string (PROGRAMMING, CAREER, STUDY_NOTES, PROJECTS, LIFE, OPINION)
 * - sort: string (newest, oldest, most_liked) (default: newest)
 * - search: string (search in title and content)
 *
 * Success: 200 with paginated articles
 * Validation error: 400
 */
const getArticlesHandler = async (req: Request, res: Response) => {
  try {
    // Validate and normalize query params
    const { page, limit, category, sort, search } = validateArticlesQuery(req.query)

    // Build filters and ordering
    const where = buildArticlesFilter(category, search)
    const orderBy = buildArticlesOrderBy(sort)

    // Get total count for pagination
    const total = await prisma.article.count({ where })

    // Get paginated articles
    const articles = await prisma.article.findMany({
      where,
      select: articleWithAuthorSelect,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform response with pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid sort parameter')) {
      throw new AppError(400, error.message)
    }
    throw error
  }
}

// Register handler with error wrapper
router.get('/', handleAsyncErrors(getArticlesHandler))

export default router
