import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from '~/schemas/db'
import pg from 'pg'
import { env } from '../src/env'

async function main(): Promise<void> {
  const client = new pg.Client({
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
  })

  await client.connect()

  try {
    const db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    console.info('Database migrations completed.')
  } finally {
    await client.end()
  }
}

void main()
