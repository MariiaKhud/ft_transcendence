import { Router } from 'express'                                                // Importing the Router class from the Express library to create modular route handlers for user-related endpoints
import type { Request, Response } from 'express'                                // Importing the Request and Response types from Express for type annotations in route handler functions
import { prisma } from '../lib/prisma.js'                                       // Importing the Prisma client instance for database interactions, allowing the route handlers to query and manipulate user data in the database
import { AppError, handleAsyncErrors } from '../middleware/error.middleware.js' // Importing the AppError class for creating custom error objects and the handleAsyncErrors function for wrapping asynchronous route handlers to catch errors and pass them to the error handling middleware

const router = Router() // Creating a new router instance for user-related routes

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/ // Regular expression for validating usernames: allows 3-20 characters, consisting of letters, numbers, and underscores only

interface PublicBadge {
  id: string
  name: string
  icon: string
}

interface PublicProfile {
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicBadge[]
  level: number
  xp: number
}

/**
 * @brief Validates the username parameter from the request and ensures it meets the required format.
 * @param {string} usernameParam - The username parameter extracted from the request URL.
 * @returns {string} - The validated and trimmed username.
 * @throws {AppError} - Throws an AppError with status code 400 if the username format is invalid.
 */
const validateUsernameParam = (usernameParam: string) => {
  const username = usernameParam.trim()

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(400, 'Validation failed: invalid username format')
  }

  return username
}

/**
 * @brief Handles the request to get a public profile by username.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
const getPublicProfileHandler = async (req: Request, res: Response) => {
  const username = validateUsernameParam(req.params.username)

  // Query the database for the user with the specified username, selecting relevant fields for the public profile, including counts of followers and following,
  // and associated badges.
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      level: true,
      xp: true,
      userBadges: {
        select: {
          badge: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  })

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Count the number of articles authored by the user that are not removed
  const articleCount = await prisma.article.count({
    where: {
      authorId: user.id,
      isRemoved: false,
    },
  })

  // Construct the public profile response object, mapping the user's badges to the expected format for the API response.
  const publicProfile: PublicProfile = {
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    articleCount,
    badges: user.userBadges.map((entry) => {
      return {
        id: entry.badge.id,
        name: entry.badge.name,
        icon: entry.badge.icon,
      }
    }),
    level: user.level,
    xp: user.xp,
  }

  res.status(200).json({ success: true, data: publicProfile })
}

router.get('/:username', handleAsyncErrors(getPublicProfileHandler))

export default router
