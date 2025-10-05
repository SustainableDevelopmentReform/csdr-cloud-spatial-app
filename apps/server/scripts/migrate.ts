import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from '~/schemas/db'
import pg from 'pg'
import { env } from '../src/env'

async function main() {
  const client = new pg.Client({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
  })
  console.log('Connect to DB')
  await client.connect()
  const db = drizzle(client, { schema })
  console.log('Start migration')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migration end')
  await client.end()
  console.log('Connection closed')
}

main()
