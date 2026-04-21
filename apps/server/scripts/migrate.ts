import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import * as schema from '~/schemas/db'
import { env } from '../src/env'

const buildClientConfig = (): pg.ClientConfig => ({
  connectionString: env.DATABASE_URL,
  options: env.DATABASE_SCHEMA
    ? `-c search_path=${env.DATABASE_SCHEMA},public`
    : undefined,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  host: env.DATABASE_URL ? undefined : env.DATABASE_HOST,
  port: env.DATABASE_URL ? undefined : env.DATABASE_PORT,
  user: env.DATABASE_URL ? undefined : env.DATABASE_USER,
  password: env.DATABASE_URL ? undefined : env.DATABASE_PASSWORD,
  database: env.DATABASE_URL ? undefined : env.DATABASE_NAME,
})

export const runMigrations = async (options?: {
  clientConfig?: pg.ClientConfig
}): Promise<void> => {
  const clientModule = await import('pg')
  const client = new clientModule.default.Client(
    options?.clientConfig ?? buildClientConfig(),
  )

  await client.connect()

  try {
    await client.query(
      `SELECT set_config('csdr.access_control_bootstrap_organization_id', $1, false)`,
      [env.ACCESS_CONTROL_BOOTSTRAP_ORGANIZATION_ID],
    )
    await client.query(
      `SELECT set_config('csdr.access_control_bootstrap_user_id', $1, false)`,
      [env.ACCESS_CONTROL_BOOTSTRAP_USER_ID],
    )

    const db = drizzle(client, { schema })

    await migrate(db, { migrationsFolder: './drizzle' })
  } finally {
    await client.end()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runMigrations()
}
