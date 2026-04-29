import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import * as schema from '~/schemas/db'
import { env } from '../src/env'
import { createDatabaseClientConfig } from '../src/lib/database-config'

export const runMigrations = async (options?: {
  clientConfig?: pg.ClientConfig
}): Promise<void> => {
  const clientModule = await import('pg')
  const client = new clientModule.default.Client(
    options?.clientConfig ?? createDatabaseClientConfig(),
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
