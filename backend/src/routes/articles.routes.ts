import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  articleDetailSelect,
  articleSummarySelect,
  articleWithAuthorSelect,
  buildArticlesFilter,
  buildArticlesOrderBy,
  calculateLevelForXp,
  mapArticleToDetails,
  validateArticlesQuery,
  validateCreateArticleInput,
  XP_REWARD_CREATE_ARTICLE,
} from './articles.route-helpers.js'

const router = Router()

// Publish a new article immediately and award the author XP.
const createArticleHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
  }

  const authorId = req.user.userId
  const { title, content, category } = validateCreateArticleInput(req.body)

  const article = await prisma.$transaction(async (tx) => {
    const created = await tx.article.create({
      data: {
        authorId,
        title,
        content,
        category,
      },
      select: articleWithAuthorSelect,
    })

    // Award XP and recompute level in the same transaction as the publish.
    const author = await tx.user.findUniqueOrThrow({
      where: { id: authorId },
      select: { xp: true },
    })

    const newXp = author.xp + XP_REWARD_CREATE_ARTICLE
    await tx.user.update({
      where: { id: authorId },
      data: { xp: newXp, level: calculateLevelForXp(newXp) },
    })

    return created
  })

  res.status(201).json({ success: true, data: { ...article, commentsCount: 0 } })
}

// List published articles with filtering and sorting, newest first by default.
const listArticlesHandler = async (req: Request, res: Response) => {
  try {
    const { page, limit, category, sort, search } = validateArticlesQuery(req.query)
    const where = buildArticlesFilter(category, search)
    const orderBy = buildArticlesOrderBy(sort)

    // Run the page of articles and the total count at the same time.
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: articleSummarySelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
      success: true,
      data: {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
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

// Get one article with its full content and comment count.
const getArticleHandler = async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: articleDetailSelect,
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  res.status(200).json({ success: true, data: mapArticleToDetails(article) })
}

router.post('/', authMiddleware, handleAsyncErrors(createArticleHandler))
router.get('/', handleAsyncErrors(listArticlesHandler))
router.get('/:id', handleAsyncErrors(getArticleHandler))

export default router
