import type { Config } from 'drizzle-kit'
import { env } from './src/env'

export default {
  schema: './src/schemas/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.DATABASE_HOST || 'localhost',
    port: env.DATABASE_PORT || 5431,
    user: env.DATABASE_USER || 'admin',
    password: env.DATABASE_PASSWORD || 'admin',
    database: env.DATABASE_NAME || 'csdr-dev',
  },
} satisfies Config
