import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const databaseUrl = (() => {
  try {
    return env('DATABASE_URL')
  } catch {
    return ''
  }
})()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // prisma generate does not require a live database URL during image builds.
    url: databaseUrl,
  },
})
