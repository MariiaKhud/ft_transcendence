import { PrismaPg } from '@prisma/adapter-pg'
import prismaClientPackage from '@prisma/client'

const { PrismaClient } = prismaClientPackage
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to initialize PrismaClient')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })

export const prisma = new PrismaClient({
	adapter,
})
