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

// User gamification stats (for profile page).
export interface UserGamificationStats {
  totalXP: number
  level: number
  badges: UserBadgeWithBadge[]
}

// Extended user with gamification for profile.
export interface UserWithGamification extends UserSummary {
  gamification: UserGamificationStats
}

// Level thresholds: cumulative XP needed to reach each level.
export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2100,
  8: 2800,
  9: 3600,
  10: 4500,
}

// Formula for levels beyond defined thresholds: (level - 1) * level * 50
export function getXPForLevel(level: number): number {
  return LEVEL_THRESHOLDS[level] ?? (level - 1) * level * 50
}

export function getNextLevelXP(level: number): number {
  return getXPForLevel(level + 1)
}

export function getLevelFromXP(totalXP: number): number {
  let level = 1
  while (getXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

export function getProgressToNextLevel(totalXP: number, level: number): {
  current: number
  needed: number
  percentage: number
} {
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getNextLevelXP(level)
  const xpInCurrentLevel = totalXP - currentLevelXP
  const xpNeeded = nextLevelXP - currentLevelXP
  const percentage = Math.min(100, (xpInCurrentLevel / xpNeeded) * 100)

  return {
    current: xpInCurrentLevel,
    needed: xpNeeded,
    percentage: Math.round(percentage),
  }
}