import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { handleAsyncErrors } from '../middleware/error.middleware.js'

const router = Router()

const getAdminUsersHandler = async (_req: Request, res: Response) => {
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

router.get(
  '/users',
  authMiddleware,
  requireRole('ADMIN'),
  handleAsyncErrors(getAdminUsersHandler),
)

export default router
