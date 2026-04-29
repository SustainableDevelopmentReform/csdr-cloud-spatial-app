import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/schemas/db'
import { createDatabaseClientConfig } from './database-config'

const pool = new pg.Pool(createDatabaseClientConfig())

export const db = drizzle(pool, {
  schema,
})

export const checkDatabaseConnection = async (): Promise<void> => {
  const client = await pool.connect()

  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}
