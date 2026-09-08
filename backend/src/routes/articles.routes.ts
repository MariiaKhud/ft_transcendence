import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js'
import { createNotification } from '../services/notifications.service.js'
import { io } from '../socket/socket.server.js'
import {
  articleDetailSelect,
  articleSummarySelect,
  articleWithAuthorSelect,
  buildArticlesFilter,
  buildArticlesOrderBy,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
  mapArticleToDetails,
  validateArticlesQuery,
  validateCreateArticleInput,
  validateUpdateArticleInput,
  XP_REWARD_CREATE_ARTICLE,
  XP_REWARD_RECEIVE_LIKE,
} from './articles.route-helpers.js'
import { commentWithAuthorSelect, validateCreateCommentInput } from './comments.route-helpers.js'
import { awardXP, checkAndAwardBadges } from '../services/gamification.service.js'
import { validateUuid } from '../lib/validation.js'

const router = Router()

router.param('id', (req, _res, next) => {
  try {
    validateUuid(req.params.id)
    next()
  } catch (error) {
    next(error)
  }
})

// Publish a new article immediately and award the author XP.
const createArticleHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
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
    await awardXP(authorId, XP_REWARD_CREATE_ARTICLE, tx)

    return created
  })

  // After article + XP are committed, check and award badges.
  await checkAndAwardBadges(authorId)

  res.status(201).json({ success: true, data: { ...article, commentsCount: 0 } })
}

// List published articles with filtering and sorting, newest first by default.
const listArticlesHandler = async (req: Request, res: Response) => {
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
}

// Get one article with full content, comment count, and whether the current user liked it.
const getArticleHandler = async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: articleDetailSelect,
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
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
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const existing = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
  }

  if (existing.authorId !== req.user.userId) {
    throw new AppError(403, ErrorCode.ARTICLE_EDIT_FORBIDDEN, 'Only the author can edit this article')
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
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const existing = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
  }

  if (existing.authorId !== req.user.userId) {
    throw new AppError(403, ErrorCode.ARTICLE_DELETE_FORBIDDEN, 'Only the author can delete this article')
  }

  // Revert the publish XP in the same transaction so delete-then-republish can't farm XP.
  await prisma.$transaction(async (tx) => {
    await tx.article.delete({ where: { id: existing.id } })
    await awardXP(existing.authorId, -XP_REWARD_CREATE_ARTICLE, tx)
  })

  res.status(200).json({ success: true, data: { id: existing.id } })
}

// Add a comment to an article and notify the article's author.
const createCommentHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const authorId = req.user.userId

  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, title: true, isRemoved: true },
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
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

  // Push the new comment live to anyone currently viewing the article.
  io.to(`article:${article.id}`).emit('comment:new', comment)

  // Push the updated comment count to anyone browsing the feed.
  const commentsCount = await prisma.comment.count({
    where: { articleId: article.id, isRemoved: false },
  })
  io.to('feed').emit('article:stats-updated', { articleId: article.id, commentsCount })

  // Don't notify authors about their own comments, or if they're already viewing this article.
  if (article.authorId !== authorId) {
    const authorSockets = await io.in(article.authorId).fetchSockets()
    const authorIsViewing = authorSockets.some((s) => s.data.activeArticleId === article.id)

    if (!authorIsViewing) {
      await createNotification(
        article.authorId,
        'COMMENT',
        `commented on your article "${article.title}"`,
        article.id
      )

      // Push the notification in real-time too, instead of waiting for the next poll.
      io.to(article.authorId).emit('notification:new', {
        type: 'COMMENT',
        message: `commented on your article "${article.title}"`,
        refId: article.id,
      })
    }
  }

  res.status(201).json({ success: true, data: comment })
}

// Toggle the current user's like on an article: insert+increment if not yet
// liked (and notify the author), delete+decrement if already liked.
const toggleLikeHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const userId = req.user.userId

  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, title: true, isRemoved: true },
  })

  if (!article || article.isRemoved) {
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
  }

  if (article.authorId === userId) {
    throw new AppError(400, ErrorCode.ARTICLE_LIKE_OWN_FORBIDDEN, "You can't like your own article")
  }

  const existingLike = await prisma.articleLike.findUnique({
    where: { userId_articleId: { userId, articleId: article.id } },
  })

  let liked: boolean
  let likeCount: number

  try {
    const result = await prisma.$transaction(async (tx) => {
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
    liked = result.liked
    likeCount = result.likeCount
  } catch (error) {
    // A concurrent toggle from the same user beat this request to the same
    // transition (duplicate create -> P2002, or delete of an already-deleted
    // row -> P2025). Resolve idempotently against the current state instead
    // of failing the request.
    if (!isPrismaUniqueConstraintError(error) && !isPrismaRecordNotFoundError(error)) {
      throw error
    }

    const [currentLike, currentArticle] = await Promise.all([
      prisma.articleLike.findUnique({
        where: { userId_articleId: { userId, articleId: article.id } },
      }),
      prisma.article.findUnique({
        where: { id: article.id },
        select: { likeCount: true },
      }),
    ])

    // Rare: the article itself was hard-deleted mid-request (racing an admin
    // delete), not just the like row — report it as gone rather than 500ing
    // on a re-read of a record that no longer exists.
    if (!currentArticle) {
      throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
    }

    // The request that actually made this transition already emitted the
    // live update and notification, so just report the resulting state.
    res.status(200).json({
      success: true,
      data: { liked: currentLike !== null, likeCount: currentArticle.likeCount },
    })
    return
  }

  // Push the updated like count live to anyone currently viewing the article, and to the feed.
  io.to(`article:${article.id}`).emit('article:like-updated', { likeCount })
  io.to('feed').emit('article:stats-updated', { articleId: article.id, likeCount })

  // Only award XP/notify on the like transition, not the unlike, and not if the author is already viewing.
  if (liked) {
    await awardXP(article.authorId, XP_REWARD_RECEIVE_LIKE)
    await checkAndAwardBadges(article.authorId)

    const authorSockets = await io.in(article.authorId).fetchSockets()
    const authorIsViewing = authorSockets.some((s) => s.data.activeArticleId === article.id)

    if (!authorIsViewing) {
      await createNotification(article.authorId, 'LIKE', `liked your article "${article.title}"`, article.id)

      io.to(article.authorId).emit('notification:new', {
        type: 'LIKE',
        message: `liked your article "${article.title}"`,
        refId: article.id,
      })
    }
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
    throw new AppError(404, ErrorCode.ARTICLE_NOT_FOUND, 'Article not found')
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
