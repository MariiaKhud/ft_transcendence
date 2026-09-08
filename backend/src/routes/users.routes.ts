// 1. All the user profile routes: search users, leaderboard, view a public profile, edit your own profile, upload/delete avatar, and delete your account
// 2. Most routes are public reads (search, leaderboard, view profile), while editing, avatar, and delete actions require authMiddleware
//    and check the logged-in user's own ID/CSRF token

import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import multer from 'multer'
import { promises as fs } from 'fs'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { ErrorCode } from '../lib/error-codes.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  editableProfileSelect,
  mapUserToPublicProfile,
  profileArticleSelect,
  publicProfileSelect,
  userSearchResultSelect,
  validateEditProfileInput,
  validateSearchQuery,
  validateUsernameParam,
  validateAvatarMimetype,
  generateAvatarFilename,
  getUploadsDir,
  deleteOldAvatar,
  deleteOldCv,
  CV_MAX_SIZE,
  generateCvFilename,
  USER_SEARCH_RESULTS_LIMIT,
  validateCvMimetype,
} from './users.route-helpers.js'
import type { EditableProfile } from './users.route-helpers.js'
import { updateOnlineStatus, getUserById } from '../controllers/users.controller.js';
import { clearAuthCookies, validateCsrfToken } from './auth.routes-helpers.js'
import { validateUuid } from '../lib/validation.js'

// Type for request with file from multer
interface FileRequest extends Request {
  file?: Express.Multer.File
}

const router = Router() // Creating a new router instance for user-related routes

router.param('userId', (req, _res, next) => {
  try {
    validateUuid(req.params.userId, 'userId')
    next()
  } catch (error) {
    next(error)
  }
})

// Configure multer for avatar uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
})

const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CV_MAX_SIZE },
})

// Middleware to handle multer errors (converts LIMIT_FILE_SIZE to HTTP 413)
const handleMulterError = (err: any, _req: Request, _res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return _res.status(413).json({ success: false, code: ErrorCode.FILE_TOO_LARGE, error: 'File too large' })
    }
  }
  next(err)
}

const searchUsersHandler = async (req: Request, res: Response) => {
  const query = validateSearchQuery(req.query.q)

  if (!query) {
    res.status(200).json({ success: true, data: { users: [], hasMore: false } })
    return
  }

  // Fetch one extra row so we can tell whether the match set was truncated,
  // without a separate (and slower) count query.
  const users = await prisma.user.findMany({
    where: {
      username: {
        contains: query,
        mode: 'insensitive',
      },
    },
    select: userSearchResultSelect,
    orderBy: { username: 'asc' },
    take: USER_SEARCH_RESULTS_LIMIT + 1,
  })

  const hasMore = users.length > USER_SEARCH_RESULTS_LIMIT
  const trimmedUsers = hasMore ? users.slice(0, USER_SEARCH_RESULTS_LIMIT) : users

  res.status(200).json({ success: true, data: { users: trimmedUsers, hasMore } })
}

interface LeaderboardRow {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  level: number
  articleCount: number
  totalLikes: number
}

const getLeaderboardHandler = async (_req: Request, res: Response) => {
  const users = await prisma.$queryRaw<LeaderboardRow[]>(
    Prisma.sql`
      SELECT
        u.id,
        u.username,
        u.display_name AS "displayName",
        u.avatar_url AS "avatarUrl",
        u.level,
        COUNT(a.id)::int AS "articleCount",
        COALESCE(SUM(a.like_count), 0)::int AS "totalLikes"
      FROM users u
      LEFT JOIN articles a
        ON a.author_id = u.id
       AND a.is_removed = false
      GROUP BY
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.level
      ORDER BY
        COALESCE(SUM(a.like_count), 0)::int DESC,
        LOWER(u.username) ASC,
        u.username ASC
      LIMIT 50
    `,
  )

  const userIds = users.map((user) => user.id)

  const userBadges =
    userIds.length > 0
      ? await prisma.userBadge.findMany({
          where: {
            userId: {
              in: userIds,
            },
          },
          select: {
            userId: true,
            earnedAt: true,
            badge: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
          orderBy: {
            earnedAt: 'asc',
          },
        })
      : []

  const badgesByUser = new Map<
    string,
    Array<{ id: string; name: string; icon: string }>
  >()

  for (const userBadge of userBadges) {
    const badges = badgesByUser.get(userBadge.userId) ?? []

    badges.push({
      id: userBadge.badge.id,
      name: userBadge.badge.name,
      icon: userBadge.badge.icon,
    })

    badgesByUser.set(userBadge.userId, badges)
  }

  const leaderboard = users.map((user, index) => ({
    id: user.id,
    rank: index + 1,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    articleCount: user.articleCount,
    totalLikes: user.totalLikes,
    badges: badgesByUser.get(user.id) ?? [],
    level: user.level,
  }))

  res.status(200).json({
    success: true,
    data: leaderboard,
  })
}

const getPublicProfileHandler = async (req: Request, res: Response) => {
  const username = validateUsernameParam(req.params.username)

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
    },
    select: publicProfileSelect,
  })

  if (!user) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  // Map the user data to the public profile format before sending the response
  const publicProfile = mapUserToPublicProfile(user)

  res.status(200).json({ success: true, data: publicProfile })
}

const getProfileArticlesHandler = async (req: Request, res: Response) => {
  const username = validateUsernameParam(req.params.username)

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
    },
    select: {
      articles: {
        where: { isRemoved: false },
        select: profileArticleSelect,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  res.status(200).json({ success: true, data: user.articles })
}

const editMyProfileHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  // Validation normalizes values and preserves undefined for fields that were not provided.
  const updates = validateEditProfileInput(req.body)

  const data: {
    displayName?: string | null
    bio?: string | null
    preferredLanguage?: string | null
  } = {}

  // Only include keys that were sent by the client to keep PATCH behavior truly partial.
  if (updates.displayName !== undefined) {
    data.displayName = updates.displayName
  }

  if (updates.bio !== undefined) {
    data.bio = updates.bio
  }

  if (updates.preferredLanguage !== undefined) {
    data.preferredLanguage = updates.preferredLanguage
  }

  // Update the user's profile in the database and return the updated profile data based on the editableProfileSelect fields.
  const updatedUser: EditableProfile = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    select: editableProfileSelect,
  })

  res.status(200).json({ success: true, data: updatedUser })
}

const uploadAvatarHandler = async (req: FileRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  // Check if file was uploaded.
  if (!req.file) {
    throw new AppError(400, ErrorCode.VALIDATION_AVATAR_REQUIRED, 'Validation failed: avatar file is required')
  }

  // Validate file mimetype.
  validateAvatarMimetype(req.file.mimetype)

  // Generate filename and save file to disk.
  const filename = generateAvatarFilename(req.file.mimetype)
  const uploadsDir = getUploadsDir()
  const filepath = `${uploadsDir}/${filename}`

  await fs.mkdir(uploadsDir, { recursive: true })
  await fs.writeFile(filepath, req.file.buffer)

  // Get current user to retrieve old avatar URL.
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { avatarUrl: true },
  })

  if (!currentUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  // Delete old avatar file if it exists.
  await deleteOldAvatar(currentUser.avatarUrl)

  // Update user with new avatar URL.
  const avatarUrl = `/uploads/${filename}`
  const updatedUser: EditableProfile = await prisma.user.update({
    where: { id: req.user.userId },
    data: { avatarUrl },
    select: editableProfileSelect,
  })

  res.status(200).json({ success: true, data: updatedUser })
}

const deleteMyAvatarHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  // Load the current avatar path for this user.
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { avatarUrl: true },
  })

  if (!currentUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  // Remove the avatar file from /uploads when it exists.
  await deleteOldAvatar(currentUser.avatarUrl)

  // Clear avatarUrl in the database and return the updated profile.
  const updatedUser: EditableProfile = await prisma.user.update({
    where: { id: req.user.userId },
    data: { avatarUrl: null },
    select: editableProfileSelect,
  })

  res.status(200).json({ success: true, data: updatedUser })
}

const uploadCvHandler = async (req: FileRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  if (!req.file) {
    throw new AppError(400, ErrorCode.VALIDATION_CV_REQUIRED, 'Validation failed: CV file is required')
  }

  validateCvMimetype(req.file.mimetype)

  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { cvUrl: true },
  })

  if (!currentUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  const filename = generateCvFilename(req.file.mimetype)
  const uploadsDir = getUploadsDir()
  await fs.mkdir(uploadsDir, { recursive: true })
  await fs.writeFile(`${uploadsDir}/${filename}`, req.file.buffer)

  try {
    await deleteOldCv(currentUser.cvUrl)
    const updatedUser: EditableProfile = await prisma.user.update({
      where: { id: req.user.userId },
      data: { cvUrl: `/uploads/${filename}`, cvFilename: req.file.originalname },
      select: editableProfileSelect,
    })

    res.status(200).json({ success: true, data: updatedUser })
  } catch (error) {
    await deleteOldCv(`/uploads/${filename}`)
    throw error
  }
}

const deleteMyCvHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { cvUrl: true },
  })

  if (!currentUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  await deleteOldCv(currentUser.cvUrl)
  const updatedUser: EditableProfile = await prisma.user.update({
    where: { id: req.user.userId },
    data: { cvUrl: null, cvFilename: null },
    select: editableProfileSelect,
  })

  res.status(200).json({ success: true, data: updatedUser })
}

// Permanently delete the authenticated user's account and all cascaded data.
const deleteMyAccountHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required')
  }

  validateCsrfToken(req, req.user.csrfToken)

  const userId = req.user.userId

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, cvUrl: true },
  })

  if (!currentUser) {
    throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found')
  }

  await prisma.$transaction(async (tx) => {
    // The user-article cascade deletes this user's own articles (and their
    // likes) wholesale, but likes they gave on *other* articles are removed
    // by the user-like cascade alone, which would leave those articles'
    // denormalized likeCount overcounted. Decrement those first.
    const likedArticles = await tx.articleLike.findMany({
      where: { userId },
      select: { articleId: true },
    })

    if (likedArticles.length > 0) {
      await tx.article.updateMany({
        where: { id: { in: likedArticles.map((like) => like.articleId) } },
        data: { likeCount: { decrement: 1 } },
      })
    }

    await tx.user.delete({ where: { id: userId } })
  })
  await deleteOldAvatar(currentUser.avatarUrl)
  await deleteOldCv(currentUser.cvUrl)
  clearAuthCookies(res)

  res.status(200).json({ success: true })
}

router.post('/me/avatar', authMiddleware, upload.single('avatar'), handleMulterError, handleAsyncErrors(uploadAvatarHandler))
router.delete('/me/avatar', authMiddleware, handleAsyncErrors(deleteMyAvatarHandler))
router.post('/me/cv', authMiddleware, uploadCv.single('cv'), handleMulterError, handleAsyncErrors(uploadCvHandler))
router.delete('/me/cv', authMiddleware, handleAsyncErrors(deleteMyCvHandler))
router.delete('/me', authMiddleware, handleAsyncErrors(deleteMyAccountHandler))
router.patch('/me', authMiddleware, handleAsyncErrors(editMyProfileHandler))
// Must be registered before '/:username' so a search request isn't swallowed by the username route.
router.get('/search', handleAsyncErrors(searchUsersHandler))
router.get('/leaderboard', handleAsyncErrors(getLeaderboardHandler))
router.get('/:username', handleAsyncErrors(getPublicProfileHandler))
router.get('/:username/articles', handleAsyncErrors(getProfileArticlesHandler))
router.patch('/me/online', authMiddleware, updateOnlineStatus)
router.get('/id/:userId', handleAsyncErrors(getUserById))

export default router
