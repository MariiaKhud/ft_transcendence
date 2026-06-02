// prisma/seed.ts
// Run with: npx prisma db seed
// Called automatically by: npx prisma migrate dev

import { PrismaClient, Role, Category, FriendStatus, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('password123', 10)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      passwordHash,
      displayName: 'Alice',
      bio: 'Frontend developer and coffee enthusiast.',
      role: Role.USER,
      xp: 120,
      level: 2,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      passwordHash,
      displayName: 'Bob',
      bio: 'Backend engineer. Loves Postgres.',
      role: Role.USER,
      xp: 80,
      level: 1,
    },
  })

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      username: 'carol',
      passwordHash,
      displayName: 'Carol',
      bio: 'Moderator and technical writer.',
      role: Role.MODERATOR,
      xp: 300,
      level: 4,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash,
      displayName: 'Admin',
      role: Role.ADMIN,
      xp: 500,
      level: 6,
    },
  })

  console.log('✅ Users created')

  // ─────────────────────────────────────────────
  // Articles
  // ─────────────────────────────────────────────

  const article1 = await prisma.article.upsert({
    where: { id: 'seed-article-1' },
    update: {},
    create: {
      id: 'seed-article-1',
      authorId: alice.id,
      title: 'Getting started with Prisma and PostgreSQL',
      content: '# Getting started\n\nPrisma makes database access easy and type-safe...',
      category: Category.PROGRAMMING,
      likeCount: 5,
    },
  })

  const article2 = await prisma.article.upsert({
    where: { id: 'seed-article-2' },
    update: {},
    create: {
      id: 'seed-article-2',
      authorId: bob.id,
      title: 'My journey learning TypeScript',
      content: '# TypeScript journey\n\nI started using TypeScript six months ago...',
      category: Category.CAREER,
      likeCount: 3,
    },
  })

  const article3 = await prisma.article.upsert({
    where: { id: 'seed-article-3' },
    update: {},
    create: {
      id: 'seed-article-3',
      authorId: alice.id,
      title: 'Study notes: Docker fundamentals',
      content: '# Docker fundamentals\n\nA container is a lightweight runtime...',
      category: Category.STUDY_NOTES,
      likeCount: 8,
    },
  })

  console.log('✅ Articles created')

  // ─────────────────────────────────────────────
  // Comments
  // ─────────────────────────────────────────────

  await prisma.comment.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-comment-1',
        articleId: article1.id,
        authorId: bob.id,
        content: 'Great intro! Prisma really changed how I work with databases.',
      },
      {
        id: 'seed-comment-2',
        articleId: article1.id,
        authorId: carol.id,
        content: 'The migration workflow is really smooth once you get used to it.',
      },
      {
        id: 'seed-comment-3',
        articleId: article2.id,
        authorId: alice.id,
        content: 'TypeScript took me a while too, but totally worth it!',
      },
    ],
  })

  console.log('✅ Comments created')

  // ─────────────────────────────────────────────
  // Likes
  // ─────────────────────────────────────────────

  await prisma.articleLike.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-like-1', userId: bob.id,   articleId: article1.id },
      { id: 'seed-like-2', userId: carol.id, articleId: article1.id },
      { id: 'seed-like-3', userId: alice.id, articleId: article2.id },
      { id: 'seed-like-4', userId: carol.id, articleId: article3.id },
      { id: 'seed-like-5', userId: bob.id,   articleId: article3.id },
    ],
  })

  console.log('✅ Likes created')

  // ─────────────────────────────────────────────
  // Follows
  // ─────────────────────────────────────────────

  await prisma.follow.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-follow-1', followerId: bob.id,   followingId: alice.id },
      { id: 'seed-follow-2', followerId: carol.id, followingId: alice.id },
      { id: 'seed-follow-3', followerId: alice.id, followingId: carol.id },
    ],
  })

  console.log('✅ Follows created')

  // ─────────────────────────────────────────────
  // Friendships
  // ─────────────────────────────────────────────

  await prisma.friendship.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-friendship-1',
        requesterId: alice.id,
        addresseeId: bob.id,
        status: FriendStatus.ACCEPTED,
      },
      {
        id: 'seed-friendship-2',
        requesterId: carol.id,
        addresseeId: alice.id,
        status: FriendStatus.PENDING,
      },
    ],
  })

  console.log('✅ Friendships created')

  // ─────────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────────

  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-msg-1',
        senderId: alice.id,
        receiverId: bob.id,
        content: 'Hey Bob, have you read my latest article?',
        isRead: true,
      },
      {
        id: 'seed-msg-2',
        senderId: bob.id,
        receiverId: alice.id,
        content: 'Yes! Left a comment. Really helpful.',
        isRead: false,
      },
    ],
  })

  console.log('✅ Messages created')

  // ─────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────

  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-notif-1',
        userId: alice.id,
        type: NotificationType.COMMENT,
        message: 'Bob commented on your article.',
        refId: article1.id,
      },
      {
        id: 'seed-notif-2',
        userId: alice.id,
        type: NotificationType.LIKE,
        message: 'Carol liked your article.',
        refId: article1.id,
      },
      {
        id: 'seed-notif-3',
        userId: alice.id,
        type: NotificationType.FOLLOWED,
        message: 'Bob started following you.',
        refId: bob.id,
      },
    ],
  })

  console.log('✅ Notifications created')

  // ─────────────────────────────────────────────
  // Badges
  // ─────────────────────────────────────────────

  const badgeFirstPost = await prisma.badge.upsert({
    where: { name: 'First Post' },
    update: {},
    create: {
      name: 'First Post',
      description: 'Published your first article.',
      icon: '✍️',
      xpReward: 50,
    },
  })

  const badgePopular = await prisma.badge.upsert({
    where: { name: 'Popular Writer' },
    update: {},
    create: {
      name: 'Popular Writer',
      description: 'Received 10 or more likes on a single article.',
      icon: '🌟',
      xpReward: 100,
    },
  })

  const badgeConsistent = await prisma.badge.upsert({
    where: { name: 'Consistent Writer' },
    update: {},
    create: {
      name: 'Consistent Writer',
      description: 'Published 5 articles.',
      icon: '📝',
      xpReward: 75,
    },
  })

  const badgeFirstLike = await prisma.badge.upsert({
    where: { name: 'First Like' },
    update: {},
    create: {
      name: 'First Like',
      description: 'Received your first like.',
      icon: '❤️',
      xpReward: 25,
    },
  })

  const badgeProlific = await prisma.badge.upsert({
    where: { name: 'Prolific Author' },
    update: {},
    create: {
      name: 'Prolific Author',
      description: 'Published 10 articles.',
      icon: '📚',
      xpReward: 150,
    },
  })

  const badgeRising = await prisma.badge.upsert({
    where: { name: 'Rising Voice' },
    update: {},
    create: {
      name: 'Rising Voice',
      description: 'Gained 5 followers.',
      icon: '🚀',
      xpReward: 60,
    },
  })

  console.log('✅ Badges created')

  // ─────────────────────────────────────────────
  // UserBadges
  // ─────────────────────────────────────────────

  await prisma.userBadge.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-ub-1', userId: alice.id, badgeId: badgeFirstPost.id },
      { id: 'seed-ub-2', userId: alice.id, badgeId: badgeFirstLike.id },
      { id: 'seed-ub-3', userId: bob.id,   badgeId: badgeFirstPost.id },
    ],
  })

  console.log('✅ UserBadges created')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
