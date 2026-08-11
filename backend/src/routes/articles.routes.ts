import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js'
import { createNotification } from '../services/notifications.service.js'
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
  validateUpdateArticleInput,
  XP_REWARD_CREATE_ARTICLE,
} from './articles.route-helpers.js'
import { commentWithAuthorSelect, validateCreateCommentInput } from './comments.route-helpers.js'
import { checkAndAwardBadges } from '../services/gamification.service.js'

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

  // After article + XP are committed, check and award badges.
  await checkAndAwardBadges(authorId)

  res.status(201).json({ success: true, data: { ...article, commentsCount: 0 } })
}

// List published articles with filtering and sorting, newest first by default.
const listArticlesHandler = async (req: Request, res: Response) => {
  try {
    const { page, limit, category, sort, search, title, author, content, postedFrom, postedTo } =
      validateArticlesQuery(req.query)
    const where = buildArticlesFilter({ category, search, title, author, content, postedFrom, postedTo })
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
          hasPrevPage: page > 1 && total > 0,
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid ')) {
      throw new AppError(400, error.message)
    }
    throw error
  }
}

// Get one article with full content, comment count, and whether the current user liked it.
const getArticleHandler = async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: articleDetailSelect,
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  const userId = req.user?.userId ?? null

  // null for guests; true/false for authenticated users
  let isLikedByCurrentUser: boolean | null = null
  if (userId) {
    const like = await prisma.articleLike.findUnique({
      where: { userId_articleId: { userId, articleId: article.id } },
    })
    isLikedByCurrentUser = like !== null
  }

  res.status(200).json({
    success: true,
    data: { ...mapArticleToDetails(article), isLikedByCurrentUser },
  })
}

// Update an article's title, content, or category. Author only.
const updateArticleHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
  }

  const existing = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  if (existing.authorId !== req.user.userId) {
    throw new AppError(403, 'Only the author can edit this article')
  }

  const updates = validateUpdateArticleInput(req.body)

  const article = await prisma.article.update({
    where: { id: existing.id },
    data: updates,
    select: articleDetailSelect,
  })

  res.status(200).json({ success: true, data: mapArticleToDetails(article) })
}

// Hard-delete an article. Author only — cascades to comments and likes via DB foreign keys.
const deleteArticleHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
  }

  const existing = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  if (existing.authorId !== req.user.userId) {
    throw new AppError(403, 'Only the author can delete this article')
  }

  // Revert the publish XP in the same transaction so delete-then-republish can't farm XP.
  await prisma.$transaction(async (tx) => {
    await tx.article.delete({ where: { id: existing.id } })

    const author = await tx.user.findUniqueOrThrow({
      where: { id: existing.authorId },
      select: { xp: true },
    })

    const newXp = Math.max(0, author.xp - XP_REWARD_CREATE_ARTICLE)
    await tx.user.update({
      where: { id: existing.authorId },
      data: { xp: newXp, level: calculateLevelForXp(newXp) },
    })
  })

  res.status(200).json({ success: true, data: { id: existing.id } })
}

// Add a comment to an article and notify the article's author.
const createCommentHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
  }

  const authorId = req.user.userId

  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, title: true, isRemoved: true },
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  const { content } = validateCreateCommentInput(req.body)

  const comment = await prisma.comment.create({
    data: {
      articleId: article.id,
      authorId,
      content,
    },
    select: commentWithAuthorSelect,
  })

  // Don't notify authors about their own comments.
  if (article.authorId !== authorId) {
    await createNotification(
      article.authorId,
      'COMMENT',
      `commented on your article "${article.title}"`,
      article.id
    )
  }

  res.status(201).json({ success: true, data: comment })
}

// Toggle the current user's like on an article: insert+increment if not yet
// liked (and notify the author), delete+decrement if already liked.
const toggleLikeHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
  }

  const userId = req.user.userId

  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, title: true, isRemoved: true },
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  if (article.authorId === userId) {
    throw new AppError(400, "You can't like your own article")
  }

  const existingLike = await prisma.articleLike.findUnique({
    where: { userId_articleId: { userId, articleId: article.id } },
  })

  const { liked, likeCount } = await prisma.$transaction(async (tx) => {
    if (existingLike) {
      await tx.articleLike.delete({ where: { id: existingLike.id } })
      const updated = await tx.article.update({
        where: { id: article.id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      })
      return { liked: false, likeCount: updated.likeCount }
    }

    await tx.articleLike.create({ data: { userId, articleId: article.id } })
    const updated = await tx.article.update({
      where: { id: article.id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    })
    return { liked: true, likeCount: updated.likeCount }
  })

  // Only notify on the like transition, not the unlike.
  if (liked) {
    await checkAndAwardBadges(article.authorId)
    await createNotification(article.authorId, 'LIKE', `liked your article "${article.title}"`, article.id)
  }

  res.status(200).json({ success: true, data: { liked, likeCount } })
}

// List all comments on an article, oldest first. Includes soft-removed
// comments so the thread keeps its shape — the frontend decides how to
// display them based on the viewer's role.
const listCommentsHandler = async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, isRemoved: true },
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, 'Article not found')
  }

  const comments = await prisma.comment.findMany({
    where: { articleId: article.id },
    select: commentWithAuthorSelect,
    orderBy: { createdAt: 'asc' },
  })

  res.status(200).json({ success: true, data: comments })
}

router.post('/', authMiddleware, handleAsyncErrors(createArticleHandler))
router.get('/', handleAsyncErrors(listArticlesHandler))
router.get('/:id', optionalAuthMiddleware, handleAsyncErrors(getArticleHandler))
router.patch('/:id', authMiddleware, handleAsyncErrors(updateArticleHandler))
router.delete('/:id', authMiddleware, handleAsyncErrors(deleteArticleHandler))
router.get('/:id/comments', handleAsyncErrors(listCommentsHandler))
router.post('/:id/comments', authMiddleware, handleAsyncErrors(createCommentHandler))
router.post('/:id/like', authMiddleware, handleAsyncErrors(toggleLikeHandler))

export default router
