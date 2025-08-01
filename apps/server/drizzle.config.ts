import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schemas/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://admin:admin@localhost:5431/csdr-dev',
  },
} satisfies Config
