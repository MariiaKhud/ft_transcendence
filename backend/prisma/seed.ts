/// <reference types="node" />

// Run with: npx prisma db seed
// Called automatically by: npx prisma migrate dev

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role, Category, FriendStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Read database connection URL from environment.
const databaseUrl = process.env.DATABASE_URL

// Crash early if URL is missing so the problem is obvious.
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database')
}

// Use the PostgreSQL adapter (same as in lib/prisma.ts)
const adapter = new PrismaPg({ connectionString: databaseUrl })

const prisma = new PrismaClient({
  adapter,
})

const main = async () => {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await prisma.userBadge.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.articleLike.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.article.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // Create users
  const alice = await prisma.user.create({
    data: {
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

  const bob = await prisma.user.create({
    data: {
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

  const carol = await prisma.user.create({
    data: {
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

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash,
      displayName: 'Admin',
      bio: 'System administrator.',
      role: Role.ADMIN,
      xp: 500,
      level: 6,
    },
  })

  console.log('✅ Users created')

  // Create articles
  const article1 = await prisma.article.create({
    data: {
      authorId: alice.id,
      title: 'Getting started with Prisma and PostgreSQL',
      content: '# Getting started\n\nPrisma makes database access easy and type-safe. Combined with PostgreSQL, you get a powerful stack.',
      category: Category.PROGRAMMING,
      likeCount: 5,
    },
  })

  const article2 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'My journey learning TypeScript',
      content: '# TypeScript journey\n\nI started using TypeScript six months ago and it has transformed how I write JavaScript.',
      category: Category.CAREER,
      likeCount: 3,
    },
  })

  const article3 = await prisma.article.create({
    data: {
      authorId: alice.id,
      title: 'Study notes: Docker fundamentals',
      content: '# Docker fundamentals\n\nA container is a lightweight runtime that packages code and dependencies together.',
      category: Category.STUDY_NOTES,
      likeCount: 8,
    },
  })

  const article4 = await prisma.article.create({
    data: {
      authorId: admin.id,
      title: 'Project planning with Docker Compose',
      content: '# Docker Compose\n\nCompose helps keep the whole stack reproducible, from local development to production.',
      category: Category.PROJECTS,
      likeCount: 2,
    },
  })

  const article5 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Life as a developer: routines and balance',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article6 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 6',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article7 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 7',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article8 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 8',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article9 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 9',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article10 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 10',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  const article11 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 11',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })      

  const article12 = await prisma.article.create({
    data: {
      authorId: bob.id,
      title: 'Test Article 12',
      content: '# Developer routines\n\nA simple routine keeps me productive and sane. Here is what I do every day.',
      category: Category.LIFE,
      likeCount: 4,
    },
  })

  console.log('✅ Articles created')

  // Create comments
  await prisma.comment.createMany({
    data: [
      {
        articleId: article1.id,
        authorId: bob.id,
        content: 'Great intro! Prisma really changed how I work with databases.',
      },
      {
        articleId: article1.id,
        authorId: carol.id,
        content: 'The migration workflow is really smooth once you get used to it.',
      },
      {
        articleId: article2.id,
        authorId: alice.id,
        content: 'TypeScript took me a while too, but totally worth it!',
      },
      {
        articleId: article3.id,
        authorId: admin.id,
        content: 'Nice summary of container basics.',
      },
    ],
  })

  console.log('✅ Comments created')

  // Create likes
  await prisma.articleLike.createMany({
    data: [
      { userId: bob.id, articleId: article1.id },
      { userId: carol.id, articleId: article1.id },
      { userId: alice.id, articleId: article2.id },
      { userId: carol.id, articleId: article3.id },
      { userId: bob.id, articleId: article3.id },
      { userId: alice.id, articleId: article4.id },
      { userId: admin.id, articleId: article5.id },
    ],
  })

  console.log('✅ Likes created')

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
