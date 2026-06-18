import { Router } from 'express'
import type { Request, Response } from 'express'
import multer from 'multer'
import { promises as fs } from 'fs'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  editableProfileSelect,
  mapUserToPublicProfile,
  publicProfileSelect,
  validateEditProfileInput,
  validateUsernameParam,
  validateAvatarMimetype,
  generateAvatarFilename,
  getUploadsDir,
  deleteOldAvatar,
} from './users.route-helpers.js'
import type { EditableProfile } from './users.route-helpers.js'

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
      return _res.status(413).json({ success: false, error: 'File too large' })
    }
  }
  next(err)
}

const getPublicProfileHandler = async (req: Request, res: Response) => {
  const username = validateUsernameParam(req.params.username)

  const user = await prisma.user.findUnique({
    where: { username },
    select: publicProfileSelect,
  })

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Map the user data to the public profile format before sending the response
  const publicProfile = mapUserToPublicProfile(user)

  res.status(200).json({ success: true, data: publicProfile })
}

const editMyProfileHandler = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(401, 'Authentication required')
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
    throw new AppError(401, 'Authentication required')
  }

  // Check if file was uploaded.
  if (!req.file) {
    throw new AppError(400, 'Validation failed: avatar file is required')
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
    throw new AppError(404, 'User not found')
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

router.post('/me/avatar', authMiddleware, upload.single('avatar'), handleMulterError, handleAsyncErrors(uploadAvatarHandler))
router.patch('/me', authMiddleware, handleAsyncErrors(editMyProfileHandler))
router.get('/:username', handleAsyncErrors(getPublicProfileHandler))

export default router
