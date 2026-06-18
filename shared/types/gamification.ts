
import type { ISODateTime } from './api'
import type { UserSummary } from './user'

// Badge definition.
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  createdAt: ISODateTime
}

// Badge earned by a user.
export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  earnedAt: ISODateTime
}

// User badge with badge details.
export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge
}

// One row in leaderboard results.
export interface LeaderboardEntry {
  rank: number
  user: UserSummary
  xp: number
  level: number
  badgesCount: number
}
