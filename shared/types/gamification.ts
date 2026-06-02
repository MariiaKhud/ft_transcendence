/**
 * @file gamification.ts
 * @description This file defines the TypeScript interfaces for the gamification features of the
 * application, including badges and leaderboards.
 */




// Importing UserSummary type for user information in gamification features
import type { UserSummary } from './user'

/**
 * @brief Represents a badge that can be earned by users in the application.
 * @interface Badge
 * @property {string} id - The unique identifier of the badge.
 * @property {string} name - The name of the badge.
 * @property {string} description - A description of the badge and how it can be earned.
 * @property {string} icon - The URL of the icon representing the badge.
 * @property {number} xpReward - The amount of experience points (XP) awarded to the user upon earning
 * the badge.
 * @property {string} createdAt - The timestamp when the badge was created.
 */
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  createdAt: string
}

/**
 * @brief Represents a badge earned by a user, including the badge details and the timestamp when
 * it was earned.
 * @interface UserBadge
 * @property {string} id - The unique identifier of the user badge record.
 * @property {string} userId - The unique identifier of the user who earned the badge.
 * @property {string} badgeId - The unique identifier of the badge that was earned.
 * @property {string} earnedAt - The timestamp when the badge was earned by the user.
 */
export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  earnedAt: string
}

/**
 * @brief Represents a badge earned by a user along with the details of the badge itself.
 * @interface UserBadgeWithBadge
 * @extends UserBadge
 * @property {Badge} badge - The details of the badge that was earned by the user.
 * @note This interface is useful for displaying user badges along with their corresponding badge
 * information in the UI.
 */
export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge
}

/**
 * @brief Represents an entry in the leaderboard, including the user's information, their rank, and
 * their gamification stats.
 * @interface LeaderboardEntry
 * @property {number} rank - The rank of the user on the leaderboard.
 * @property {UserSummary} user - A summary of the user's information.
 * @property {number} xp - The total experience points (XP) accumulated by the user.
 * @property {number} level - The current level of the user based on their XP.
 * @property {number} badgesCount - The total number of badges earned by the user.
 */
export interface LeaderboardEntry {
  rank: number
  user: UserSummary
  xp: number
  level: number
  badgesCount: number
}
