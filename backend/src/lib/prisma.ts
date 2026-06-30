import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Read database connection URL from environment.
const databaseUrl = process.env.DATABASE_URL

// Crash early if URL is missing so the problem is obvious at startup.
if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to initialize PrismaClient')
}

// Use the PostgreSQL adapter so Prisma talks directly to Postgres.
const adapter = new PrismaPg({ connectionString: databaseUrl })

// Single shared Prisma client used by the whole app.
export const prisma = new PrismaClient({
	adapter,
})
