import { prisma } from '../lib/prisma.js'
import { validateUuid } from '../lib/validation.js'
import { getLevelFromXP } from '../../../shared/types/gamification.js'
import { Prisma } from '@prisma/client'

type Db = typeof prisma | Prisma.TransactionClient

export function calculateLevel(xp: number): number {
  return getLevelFromXP(xp)
}

// Adds (or, with a negative amount, removes) XP for a user and recomputes
// their level. Pass a transaction client to keep this atomic with other
// writes (e.g. the article that earned the XP); defaults to a standalone
// query otherwise. XP never drops below 0.
//
// The read-modify-write is done against a row locked with SELECT ... FOR
// UPDATE so two concurrent awards to the same user (e.g. two near-simultaneous
// likes) serialize instead of both reading the same starting xp and one
// clobbering the other's update. FOR UPDATE only holds its lock for the life
// of a transaction, so when the caller didn't already give us one, we open
// one here.
export async function awardXP(userId: string, amount: number, db: Db = prisma) {
  validateUuid(userId, 'userId')

  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('XP amount must be a non-zero integer')
  }

  const apply = async (tx: Db) => {
    const [locked] = await tx.$queryRaw<{ xp: number; level: number }[]>(
      Prisma.sql`SELECT xp, level FROM users WHERE id = ${userId} FOR UPDATE`,
    )

    if (!locked) {
      throw new Error(`User not found: ${userId}`)
    }

    const xp = Math.max(0, locked.xp + amount)
    const level = calculateLevel(xp)

    const updated = await tx.user.update({
      where: { id: userId },
      data: { xp, level },
      select: { id: true, xp: true, level: true },
    })

    return { ...updated, leveledUp: level > locked.level }
  }

  return db === prisma ? prisma.$transaction((tx) => apply(tx)) : apply(db)
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
  validateUuid(userId, 'userId')

  const [articleCount, likesAggregate, allBadges, earnedBadges] = await Promise.all([
    prisma.article.count({
      where: {
        authorId: userId,
        isRemoved: false,
      },
    }),

    prisma.article.aggregate({
      where: {
        authorId: userId,
        isRemoved: false,
      },
      _sum: {
        likeCount: true,
      },
    }),

    prisma.badge.findMany({
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.userBadge.findMany({
      where: { userId },
      select: {
        badgeId: true,
      },
    }),
  ])

  const totalLikes = likesAggregate._sum.likeCount ?? 0
  const earnedBadgeIds = new Set(
    earnedBadges.map((badge) => badge.badgeId),
  )

  const newBadges = allBadges.filter((badge) => {
    const isEligible = getBadgeCondition(
      badge.name,
      articleCount,
      totalLikes,
    )

    return isEligible && !earnedBadgeIds.has(badge.id)
  })

  if (newBadges.length === 0) {
    return { awardedCount: 0 }
  }

  const result = await prisma.$transaction(async (tx) => {
    const awarded = await tx.userBadge.createMany({
      data: newBadges.map((badge) => ({
        userId,
        badgeId: badge.id,
      })),
      skipDuplicates: true,
    })

    await Promise.all(
      newBadges.map((badge) =>
        tx.notification.create({
          data: {
            userId,
            type: 'BADGE',
            message: badge.name,
            refId: userId,
          },
        }),
      ),
    )

    return awarded
  })

  return {
    awardedCount: result.count,
  }
}