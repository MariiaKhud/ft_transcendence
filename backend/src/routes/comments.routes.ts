import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { io } from '../socket/socket.server.js'
import {
  commentWithAuthorSelect,
  validateCreateCommentInput,
  validateRemoveCommentInput,
} from './comments.route-helpers.js'
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

// Update a comment's content. Author only.
const updateCommentHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const existing = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, ErrorCode.COMMENT_NOT_FOUND, 'Comment not found')
  }

  if (existing.authorId !== req.user.userId) {
    throw new AppError(403, ErrorCode.COMMENT_EDIT_FORBIDDEN, 'Only the author can edit this comment')
  }

  const { content } = validateCreateCommentInput(req.body)

  const comment = await prisma.comment.update({
    where: { id: existing.id },
    data: { content },
    select: commentWithAuthorSelect,
  })

  // Push the edit live to anyone currently viewing the article.
  io.to(`article:${comment.articleId}`).emit('comment:updated', comment)

  res.status(200).json({ success: true, data: comment })
}

// Delete a comment. The author hard-deletes their own comment; a moderator/admin
// soft-removes someone else's comment with a reason instead.
const deleteCommentHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const existing = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { id: true, articleId: true, authorId: true, isRemoved: true },
  })

  if (!existing || existing.isRemoved) {
    throw new AppError(404, ErrorCode.COMMENT_NOT_FOUND, 'Comment not found')
  }

  if (existing.authorId === req.user.userId) {
    await prisma.comment.delete({ where: { id: existing.id } })

    // Push the removal live to anyone currently viewing the article.
    io.to(`article:${existing.articleId}`).emit('comment:deleted', { id: existing.id })

    // Push the updated comment count to anyone browsing the feed.
    const commentsCount = await prisma.comment.count({
      where: { articleId: existing.articleId, isRemoved: false },
    })
    io.to('feed').emit('article:stats-updated', { articleId: existing.articleId, commentsCount })

    res.status(200).json({ success: true, data: { id: existing.id } })
    return
  }

  if (req.user.role !== 'MODERATOR' && req.user.role !== 'ADMIN') {
    throw new AppError(403, ErrorCode.COMMENT_DELETE_FORBIDDEN, 'Only the author or a moderator can delete this comment')
  }

  const { reason } = validateRemoveCommentInput(req.body)

  const comment = await prisma.comment.update({
    where: { id: existing.id },
    data: { isRemoved: true, removedReason: reason, removedAt: new Date() },
    select: commentWithAuthorSelect,
  })

  // Push the removal live to anyone currently viewing the article.
  io.to(`article:${comment.articleId}`).emit('comment:updated', comment)

  // Push the updated comment count to anyone browsing the feed.
  const commentsCount = await prisma.comment.count({
    where: { articleId: comment.articleId, isRemoved: false },
  })
  io.to('feed').emit('article:stats-updated', { articleId: comment.articleId, commentsCount })

  res.status(200).json({ success: true, data: comment })
}

router.patch('/:id', authMiddleware, handleAsyncErrors(updateCommentHandler))
router.delete('/:id', authMiddleware, handleAsyncErrors(deleteCommentHandler))

export default router
