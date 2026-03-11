import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/schemas/db'
import { env } from '../env'

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  host: env.DATABASE_URL ? undefined : env.DATABASE_HOST,
  port: env.DATABASE_URL ? undefined : env.DATABASE_PORT,
  user: env.DATABASE_URL ? undefined : env.DATABASE_USER,
  password: env.DATABASE_URL ? undefined : env.DATABASE_PASSWORD,
  database: env.DATABASE_URL ? undefined : env.DATABASE_NAME,
})
export const db = drizzle(pool, {
  schema,
})
