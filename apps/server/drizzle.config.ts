import type { Config } from 'drizzle-kit'

const databaseSslMode =
  process.env.DATABASE_SSL_MODE ??
  (process.env.NODE_ENV === 'production' ? 'require' : 'disable')
const ssl =
  databaseSslMode === 'disable'
    ? false
    : {
        rejectUnauthorized: databaseSslMode === 'verify-full',
        ca: process.env.DATABASE_SSL_CA_CERT,
      }

export default {
  schema: './src/schemas/db.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5431'),
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'admin',
    database: process.env.DATABASE_NAME || 'sdf-dev',
    ssl,
  },
} satisfies Config
