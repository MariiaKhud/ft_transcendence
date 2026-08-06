import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

type BadgeRow = Prisma.BadgeGetPayload<{
  select: {
    id: true
    name: true
  }
}>

type EarnedBadgeRow = Prisma.UserBadgeGetPayload<{
  select: {
    badgeId: true
  }
}>

export function calculateLevel(xp: number): number {
  if (xp >= 1000) return 5
  if (xp >= 600) return 4
  if (xp >= 300) return 3
  if (xp >= 100) return 2
  return 1
}

export async function awardXP(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('XP amount must be a positive integer')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, xp: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const xp = user.xp + amount
  const level = calculateLevel(xp)

  return prisma.user.update({
    where: { id: userId },
    data: { xp, level },
    select: { id: true, xp: true, level: true },
  })
}

function getBadgeCondition(badgeName: string, articleCount: number, totalLikes: number): boolean {
  switch (badgeName) {
    case 'First Post':
      return articleCount >= 1
    case 'Consistent Writer':
      return articleCount >= 5
    case 'Prolific Author':
      return articleCount >= 20
    case 'First Like':
      return totalLikes >= 1
    case 'Rising Voice':
      return totalLikes >= 10
    case 'Popular Writer':
      return totalLikes >= 50
    default:
      return false
  }
}

export async function checkAndAwardBadges(userId: string) {
  const [articleCount, likesAggregate, allBadges, earnedBadges] = await Promise.all([
    prisma.article.count({
      where: { authorId: userId, isRemoved: false },
    }),
    prisma.article.aggregate({
      where: { authorId: userId, isRemoved: false },
      _sum: { likeCount: true },
    }),
    prisma.badge.findMany({
      select: { id: true, name: true },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    }),
  ])

  const totalLikes = likesAggregate._sum.likeCount ?? 0
  const earnedBadgeIds = new Set(earnedBadges.map((entry: EarnedBadgeRow) => entry.badgeId))

  const eligibleBadges = allBadges.filter((badge: BadgeRow) =>
    getBadgeCondition(badge.name, articleCount, totalLikes),
  )

  const newBadges = eligibleBadges.filter((badge: BadgeRow) => !earnedBadgeIds.has(badge.id))

  if (newBadges.length === 0) {
    return { awardedCount: 0 }
  }

  const result = await prisma.userBadge.createMany({
    data: newBadges.map((badge: BadgeRow) => ({
      userId,
      badgeId: badge.id,
    })),
    skipDuplicates: true,
  })

  return { awardedCount: result.count }
}