import { prisma } from '../lib/prisma.js'

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
    select: {
      id: true,
      xp: true,
      level: true,
    },
  })
}