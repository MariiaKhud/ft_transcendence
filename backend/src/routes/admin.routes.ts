import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { handleAsyncErrors } from '../middleware/error.middleware.js'
import * as notificationsService from '../services/notifications.service.js'
import { NotificationType } from '@prisma/client'

const router = Router()

const VALID_ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const
type UserRole = (typeof VALID_ROLES)[number]

const getAdminUsersHandler = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          articles: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const data = users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
    articleCount: user._count.articles,
  }))

  res.status(200).json({
    success: true,
    data,
  })
}

const changeUserRoleHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  const { role } = req.body as { role?: string }

  if (!VALID_ROLES.includes(role as UserRole)) {
    res.status(400).json({
      success: false,
      error: 'Role must be USER, MODERATOR, or ADMIN',
    })
    return
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  })

  if (!targetUser) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    })
    return
  }

  // Administrators cannot demote another administrator.
  if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Cannot demote another administrator',
    })
    return
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role: role as UserRole },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          articles: true,
        },
      },
    },
  })


  res.status(200).json({
    success: true,
    data: {
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      articleCount: updatedUser._count.articles,
    },
  })
}

const getAdminArticlesHandler = async (req: Request, res: Response) => {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      likeCount: true,
      isRemoved: true,
      removedReason:true,
      removedAt: true,
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
        select: {comments: true,}
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const data = articles.map((article) => ({
    id: article.id,
    title: article.title,
    category: article.category,
    likeCount: article.likeCount,
    isRemoved: article.isRemoved,
    removedReason: article.removedReason,
    removedAt: article.removedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    commentsCount: article._count.comments,
    author: article.author,
  }))

  res.status(200).json({
    success: true,
    data,
  })

}

const removeArticleHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  const { removedReason } = req.body as { removedReason?: string }

  if (
    typeof removedReason !== 'string' ||
    removedReason.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      error: 'Removal reason is required',
    })
    return
  }

  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      isRemoved: true,
    },
  })

  if (!article) {
    res.status(404).json({
      success: false,
      error: 'Article not found',
    })
    return
  }

  const updatedArticle = await prisma.article.update({
    where: { id },
    data: {
      isRemoved: true,
      removedReason: removedReason.trim(),
      removedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      isRemoved: true,
      removedReason: true,
      removedAt: true,
    },
  })

  await notificationsService.createNotification(
    article.authorId,
    NotificationType.CONTENT_REMOVED,
    `Your article "${updatedArticle.title}" was removed by a moderator.`,
    updatedArticle.id,
  )

  res.status(200).json({
    success: true,
    data: updatedArticle,
  })
}


const removeCommentHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  const { removedReason } = req.body as {
    removedReason?: string
  }

  if (
    typeof removedReason !== 'string' ||
    removedReason.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      error: 'Removal reason is required',
    })
    return
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      isRemoved: true,
    },
  })

  if (!comment) {
    res.status(404).json({
      success: false,
      error: 'Comment not found',
    })
    return
  }

  if (comment.isRemoved) {
    res.status(400).json({
      success: false,
      error: 'Comment is already removed',
    })
    return
  }

  const updatedComment = await prisma.comment.update({
    where: { id },
    data: {
      isRemoved: true,
      removedReason: removedReason.trim(),
      removedAt: new Date(),
    },
    select: {
      id: true,
      content: true,
      isRemoved: true,
      removedReason: true,
      removedAt: true,
    },
  })

  await notificationsService.createNotification(
    comment.authorId,
    NotificationType.CONTENT_REMOVED,
    'Your comment was removed by a moderator.',
    updatedComment.id,
  )

  res.status(200).json({
    success: true,
    data: updatedComment,
  })
}

// Admin routes: user management, role management, and content moderation.
router.get('/users', authMiddleware, requireRole('ADMIN'), handleAsyncErrors(getAdminUsersHandler),)
router.patch('/users/:id/role', authMiddleware, requireRole('ADMIN'), handleAsyncErrors(changeUserRoleHandler),)
router.get('/articles', authMiddleware, requireRole('MODERATOR'), handleAsyncErrors(getAdminArticlesHandler),)
router.patch('/articles/:id/remove', authMiddleware, requireRole('MODERATOR'), handleAsyncErrors(removeArticleHandler),)
router.patch('/comments/:id/remove', authMiddleware, requireRole('MODERATOR'), handleAsyncErrors(removeCommentHandler),)

export default router
