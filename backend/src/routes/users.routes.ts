import { Router } from 'express'
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
  USER_SEARCH_RESULTS_LIMIT,
} from './users.route-helpers.js'
import type { EditableProfile } from './users.route-helpers.js'
import { updateOnlineStatus } from '../controllers/users.controller.js';

// Type for request with file from multer
interface FileRequest extends Request {
  file?: Express.Multer.File
}

const router = Router() // Creating a new router instance for user-related routes

// Configure multer for avatar uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
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

const getPublicProfileHandler = async (req: Request, res: Response) => {
  const username = validateUsernameParam(req.params.username)

  const user = await prisma.user.findUnique({
    where: { username },
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

  const user = await prisma.user.findUnique({
    where: { username },
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
  } = {}

  // Only include keys that were sent by the client to keep PATCH behavior truly partial.
  if (updates.displayName !== undefined) {
    data.displayName = updates.displayName
  }

  if (updates.bio !== undefined) {
    data.bio = updates.bio
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

router.post('/me/avatar', authMiddleware, upload.single('avatar'), handleMulterError, handleAsyncErrors(uploadAvatarHandler))
router.delete('/me/avatar', authMiddleware, handleAsyncErrors(deleteMyAvatarHandler))
router.patch('/me', authMiddleware, handleAsyncErrors(editMyProfileHandler))
// Must be registered before '/:username' so a search request isn't swallowed by the username route.
router.get('/search', handleAsyncErrors(searchUsersHandler))
router.get('/:username', handleAsyncErrors(getPublicProfileHandler))
router.get('/:username/articles', handleAsyncErrors(getProfileArticlesHandler))
router.patch('/me/online', authMiddleware, updateOnlineStatus);

export default router
