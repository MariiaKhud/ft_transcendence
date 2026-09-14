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

    if (level > locked.level) {
      await tx.notification.create({
        data: {
          userId,
          type: 'LEVEL_UP',
          message: String(level),
          refId: userId,
          actorId: userId,
        },
      })
    }

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

  const [articleCount, likesAggregate, allBadges] = await Promise.all([
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
        xpReward: true,
      },
    }),
  ])

  const totalLikes = likesAggregate._sum.likeCount ?? 0

  const eligibleBadges = allBadges.filter((badge) =>
    getBadgeCondition(badge.name, articleCount, totalLikes),
  )

  if (eligibleBadges.length === 0) {
    return { awardedCount: 0 }
  }

  return prisma.$transaction(async (tx) => {
    // Decide what's actually new while holding the user's row lock: two
    // concurrent checks (two likes landing together, say) would otherwise both
    // see the same badge as unearned and pay out its xpReward twice. Holding
    // the lock also means the unique constraint can't fire, so a duplicate
    // would be a real bug rather than something to skip over silently.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`)

    const earnedBadges = await tx.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    })
    const earnedBadgeIds = new Set(earnedBadges.map((badge) => badge.badgeId))

    const newBadges = eligibleBadges.filter((badge) => !earnedBadgeIds.has(badge.id))

    if (newBadges.length === 0) {
      return { awardedCount: 0 }
    }

    await tx.userBadge.createMany({
      data: newBadges.map((badge) => ({
        userId,
        badgeId: badge.id,
      })),
    })

    await Promise.all(
      newBadges.map((badge) =>
        tx.notification.create({
          data: {
            userId,
            type: 'BADGE',
            message: badge.name,
            // Points at the earner's own profile, which is where badges are
            // shown — this is a system notification, so there's no other actor.
            refId: userId,
            actorId: userId,
          },
        }),
      ),
    )

    const xpReward = newBadges.reduce((total, badge) => total + badge.xpReward, 0)
    if (xpReward > 0) {
      await awardXP(userId, xpReward, tx)
    }

    return { awardedCount: newBadges.length }
  })
}