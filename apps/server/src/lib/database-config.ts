import type pg from 'pg'
import { env } from '../env'

const createDatabaseSslConfig = (): pg.ClientConfig['ssl'] => {
  if (env.DATABASE_SSL_MODE === 'disable') {
    return false
  }

  return {
    rejectUnauthorized: env.DATABASE_SSL_MODE === 'verify-full',
    ca: env.DATABASE_SSL_CA_CERT,
  }
}

export const createDatabaseClientConfig = (): pg.ClientConfig => ({
  connectionString: env.DATABASE_URL,
  options: env.DATABASE_SCHEMA
    ? `-c search_path=${env.DATABASE_SCHEMA},public`
    : undefined,
  ssl: createDatabaseSslConfig(),
  host: env.DATABASE_URL ? undefined : env.DATABASE_HOST,
  port: env.DATABASE_URL ? undefined : env.DATABASE_PORT,
  user: env.DATABASE_URL ? undefined : env.DATABASE_USER,
  password: env.DATABASE_URL ? undefined : env.DATABASE_PASSWORD,
  database: env.DATABASE_URL ? undefined : env.DATABASE_NAME,
})
