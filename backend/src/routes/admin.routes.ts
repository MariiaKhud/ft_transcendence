import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { handleAsyncErrors } from '../middleware/error.middleware.js'

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



const changeUserRole = async (req: Request, res: Response) => {
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

// Admin routes: user management, role management, and content moderation.
router.get('/users', authMiddleware, requireRole('ADMIN'), handleAsyncErrors(getAdminUsersHandler),)
router.patch('/users/:id/role', authMiddleware, requireRole('ADMIN'), handleAsyncErrors(changeUserRole),)

export default router
