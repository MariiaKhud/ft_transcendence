



// Importing UserSummary type for user information in gamification features
import type { UserSummary } from './user'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  createdAt: string
}

export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  earnedAt: string
}

export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge
}

export interface LeaderboardEntry {
  rank: number
  user: UserSummary
  xp: number
  level: number
  badgesCount: number
}
