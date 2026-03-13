import { inject } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.APP_URL = 'http://localhost:3000'
process.env.AUTH_BASE_URL = 'http://localhost'
process.env.AUTH_EMAIL_MODE = 'log'
process.env.TRUSTED_ORIGINS = 'http://localhost,http://localhost:3000'
process.env.BETTER_AUTH_SECRET =
  'test-secret-that-is-long-enough-for-better-auth'
process.env.DATABASE_URL = inject('databaseUrl')
