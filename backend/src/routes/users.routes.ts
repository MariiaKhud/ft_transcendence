import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  editableProfileSelect,
  mapUserToPublicProfile,
  publicProfileSelect,
  validateEditProfileInput,
  validateUsernameParam,
} from './users.route-helpers.js'
import type { EditableProfile } from './users.route-helpers.js'

const router = Router() // Creating a new router instance for user-related routes

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

router.patch('/me', authMiddleware, handleAsyncErrors(editMyProfileHandler))
router.get('/:username', handleAsyncErrors(getPublicProfileHandler))

export default router
