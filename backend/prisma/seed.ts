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

  const mainuser = await prisma.user.create({
    data: {
      email: 'mainuser@example.com',
      username: 'mainuser_writer_long',  // long username
      passwordHash,
      displayName: 'Maximiliaaaaaaan III',  // long display name
      bio: `I am a passionate full-stack developer with over a decade of experience building web applications, distributed systems, and everything in between. My journey started with PHP and jQuery (yes, really), evolved through Angular and Ruby on Rails, and eventually landed me here in the beautiful world of TypeScript, React, and PostgreSQL.

When I am not writing code, you will find me reading about software architecture, arguing about tabs vs spaces (spaces, obviously), mentoring junior developers.`,
      role: Role.USER,
      xp: 950,
      level: 8,
    },
  })

  console.log('✅ Users created')

  // Create badges
  const badgeDefinitions = [
    {
      name: 'First Post',
      description: 'Write 1 article',
      icon: 'sparkles',
      xpReward: 10,
    },
    {
      name: 'Consistent Writer',
      description: 'Write 5 articles',
      icon: 'pen',
      xpReward: 20,
    },
    {
      name: 'Prolific Author',
      description: 'Write 20 articles',
      icon: 'book-open',
      xpReward: 50,
    },
    {
      name: 'First Like',
      description: 'Receive 1 like',
      icon: 'heart',
      xpReward: 10,
    },
    {
      name: 'Rising Voice',
      description: 'Receive 10 likes',
      icon: 'trending-up',
      xpReward: 20,
    },
    {
      name: 'Popular Writer',
      description: 'Receive 50 likes',
      icon: 'trophy',
      xpReward: 50,
    },
  ]

  await prisma.badge.createMany({
    data: badgeDefinitions,
  })

  const mainuserBadges = await prisma.badge.findMany({
    select: {
      id: true,
    },
  })

  await prisma.userBadge.createMany({
    data: mainuserBadges.map((badge) => ({
      userId: mainuser.id,
      badgeId: badge.id,
    })),
    skipDuplicates: true,
  })
  
  console.log('✅ Badges created')

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

  const articleLong = await prisma.article.create({
    data: {
      authorId: mainuser.id,
      title: 'A Comprehensive Deep Dive into Modern Full-Stack Development: Architecture, Patterns, and Everything In Between',
      content: `# A Comprehensive Deep Dive into Modern Full-Stack Development

  ## Introduction

  Full-stack development has evolved dramatically over the past decade. What once required separate specialists for frontend, backend, and database work can now be handled by a single developer armed with TypeScript, React, Node.js, and PostgreSQL. But with great power comes great responsibility — and a lot of architectural decisions.

  In this article, I want to walk you through everything I have learned building production applications: from project structure to deployment, from authentication patterns to real-time features.

  ---

  ## Part 1: Project Structure

  The way you organize your code matters more than most developers realize. A flat structure works fine for a weekend project. It becomes a maintenance nightmare at scale.

  ### The Monorepo Approach

  We use a monorepo with three main directories:

  \`\`\`
  project/
  ├── frontend/     # React + TypeScript + Vite
  ├── backend/      # Node.js + Express + TypeScript
  ├── shared/       # Types used by both sides
  └── docker-compose.yml
  \`\`\`

  The \`shared/\` directory is the secret weapon. When you define your API response types once and import them on both sides, TypeScript catches mismatches at compile time rather than at 2am in production.

  ### Backend Structure

  \`\`\`
  backend/src/
  ├── routes/       # URL definitions only
  ├── controllers/  # Request/response handling
  ├── services/     # Business logic + Prisma calls
  ├── middleware/   # Auth, error handling
  └── lib/          # Utilities, Prisma client
  \`\`\`

  This three-layer pattern (controller → service → database) keeps concerns separated. Controllers never call Prisma directly. Services never know about \`req\` or \`res\`. This sounds like over-engineering until you try to write tests or swap out your ORM.

  ---

  ## Part 2: Authentication

  Authentication is where most tutorials lead you astray. Let me be specific about what actually works in production.

  ### JWT in HttpOnly Cookies

  Do not store JWTs in localStorage. I am not going to be subtle about this. LocalStorage is accessible to any JavaScript on your page, including injected scripts from XSS attacks.

  Instead:

  1. On login, sign a JWT and set it as an **HttpOnly cookie**
  2. The browser sends it automatically on every request
  3. JavaScript cannot read it — not your code, not an attacker's code

  \`\`\`typescript
  res.cookie('token', jwt, {
    httpOnly: true,
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  })
  \`\`\`

  ### Role-Based Access Control

  Roles should live in the JWT payload, not require a database lookup on every request:

  \`\`\`typescript
  const payload = {
    userId: user.id,
    role: user.role,   // 'USER' | 'MODERATOR' | 'ADMIN'
  }
  \`\`\`

  Your middleware checks the role from the token. A separate \`requireRole('ADMIN')\` middleware guards sensitive routes.

  ---

  ## Part 3: Database Design

  PostgreSQL with Prisma is one of the most productive combinations I have used. A few lessons learned:

  ### Use UUIDs, Not Auto-Increment IDs

  \`\`\`prisma
  model User {
    id String @id @default(uuid())
  }
  \`\`\`

  Auto-increment IDs expose your data volume (users can see that they are user #47 and guess you have 46 other users). They also cause merge conflicts in distributed systems. UUIDs are opaque and safe to expose.

  ### Soft Deletes for Moderated Content

  When a moderator removes an article, do not delete the row. Mark it:

  \`\`\`prisma
  model Article {
    isRemoved     Boolean   @default(false)
    removedReason String?
    removedAt     DateTime?
  }
  \`\`\`

  This gives you an audit trail, lets you restore content, and means the foreign key constraints stay intact.

  ### Cached Counters

  Counting likes by joining \`article_likes\` on every feed request is slow at scale. Instead, maintain a \`likeCount\` column and update it in a transaction when likes are added or removed:

  \`\`\`typescript
  await prisma.$transaction([
    prisma.articleLike.create({ data: { userId, articleId } }),
    prisma.article.update({
      where: { id: articleId },
      data: { likeCount: { increment: 1 } },
    }),
  ])
  \`\`\`

  ---

  ## Part 4: Real-Time Features with WebSockets

  REST is great for CRUD. It is terrible for "tell me when something happens." This is where WebSockets come in.

  We use **Socket.io** because it handles reconnection, fallback transports, and room-based broadcasting out of the box.

  ### Authentication on WebSockets

  The trick is reusing your existing HTTP cookie. When the browser opens a WebSocket connection, it sends cookies automatically:

  \`\`\`typescript
  io.use((socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '')
    const token = cookies['token']
    
    if (!token) return next(new Error('Unauthorized'))
    
    try {
      const decoded = verifyAuthToken(token)
      socket.data.userId = decoded.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })
  \`\`\`

  ### Room-Based Broadcasting

  Do not broadcast to all connected clients. Use rooms:

  \`\`\`typescript
  // Each user joins a room named after their userId
  await socket.join(userId)

  // Send a message to one specific user
  io.to(receiverId).emit('chat:message', message)
  \`\`\`

  This is efficient — the message only travels to the target user's connection, not everyone on the server.

  ### Online Status

  The elegant solution: mark online on \`connect\`, mark offline on \`disconnect\`. No polling needed:

  \`\`\`typescript
  io.on('connection', async (socket) => {
    await prisma.user.update({
      where: { id: socket.data.userId },
      data: { isOnline: true },
    })

    socket.on('disconnect', async () => {
      await prisma.user.update({
        where: { id: socket.data.userId },
        data: { isOnline: false },
      })
    })
  })
  \`\`\`

  ---

  ## Part 5: Deployment

  Docker Compose is the right choice for a project like this. One command, reproducible environment, same setup locally and on the server.

  ### The Four Services

  \`\`\`yaml
  services:
    postgres:   # database
    backend:    # Node.js API
    frontend:   # Vite dev server or static build
    nginx:      # reverse proxy + HTTPS termination
  \`\`\`

  Nginx handles HTTPS so your application code never needs to deal with certificates. It also proxies \`/api\` to the backend and everything else to the frontend.

  ### Environment Variables

  Never commit secrets. Use \`.env.example\` with placeholder values:

  \`\`\`bash
  DATABASE_URL=postgresql://user:password@postgres:5432/dbname
  JWT_SECRET=change-me
  \`\`\`

  Developers copy this to \`.env\` and fill in real values. The \`.env\` file is in \`.gitignore\`.

  ---

  ## Conclusion

  Modern full-stack development is genuinely good now. The tools fit together well, TypeScript catches entire categories of bugs before they reach production, and the developer experience has never been better.

  The patterns in this article — monorepo structure, HttpOnly JWTs, Prisma with PostgreSQL, WebSocket rooms, Docker Compose — are not theoretical. They are what we use in this very application.

  If you made it to the end of this very long article, thank you for your patience. Go drink some water. You deserve it.`,
      category: Category.PROGRAMMING,
      likeCount: 0,
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
      {
        articleId: article12.id,
        authorId: mainuser.id,
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
      { userId: mainuser.id, articleId: article1.id },
      { userId: mainuser.id, articleId: article2.id },
      { userId: mainuser.id, articleId: article3.id },
      { userId: mainuser.id, articleId: article4.id },
      { userId: mainuser.id, articleId: article5.id },
    ],
  })

  console.log('✅ Likes created')

  // Award badges according to actual user achievements.
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
    },
  })

  const seededBadges = await prisma.badge.findMany({
    select: {
      id: true,
      name: true,
    },
  })

  const badgesByName = new Map(
    seededBadges.map((badge) => [badge.name, badge]),
  )

  for (const user of users) {
    const articleCount = await prisma.article.count({
      where: {
        authorId: user.id,
      },
    })

    const receivedLikes = await prisma.articleLike.count({
      where: {
        article: {
          authorId: user.id,
        },
      },
    })

    const earnedBadgeNames: string[] = []

    if (articleCount >= 1) {
      earnedBadgeNames.push('First Post')
    }

    if (articleCount >= 5) {
      earnedBadgeNames.push('Consistent Writer')
    }

    if (articleCount >= 20) {
      earnedBadgeNames.push('Prolific Author')
    }

    if (receivedLikes >= 1) {
      earnedBadgeNames.push('First Like')
    }

    if (receivedLikes >= 10) {
      earnedBadgeNames.push('Rising Voice')
    }

    if (receivedLikes >= 50) {
      earnedBadgeNames.push('Popular Writer')
    }

    const userBadges = earnedBadgeNames
      .map((name) => badgesByName.get(name))
      .filter((badge): badge is { id: string; name: string } => Boolean(badge))
      .map((badge) => ({
        userId: user.id,
        badgeId: badge.id,
      }))

    if (userBadges.length > 0) {
      await prisma.userBadge.createMany({
        data: userBadges,
        skipDuplicates: true,
      })
    }

    console.log(
      `🏅 ${user.username}: ${articleCount} articles, ${receivedLikes} received likes, ${userBadges.length} badges`,
    )
  }
  
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
