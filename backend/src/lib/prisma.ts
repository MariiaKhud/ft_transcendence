import { PrismaClient } from '@prisma/client' // Importing the PrismaClient class from the @prisma/client package, which is used to interact with the database using Prisma ORM.

export const prisma = new PrismaClient()      // Creating an instance of PrismaClient to be used throughout the application for database operations.
