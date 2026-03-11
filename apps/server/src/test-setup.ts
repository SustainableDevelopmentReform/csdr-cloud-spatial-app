import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { sql } from 'drizzle-orm'
import { fileURLToPath } from 'url'
import { afterAll, beforeEach } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.APP_URL = 'http://localhost:3000'
process.env.AUTH_BASE_URL = 'http://localhost'
process.env.AUTH_EMAIL_MODE = 'log'
process.env.TRUSTED_ORIGINS = 'http://localhost,http://localhost:3000'
process.env.BETTER_AUTH_SECRET =
  'test-secret-that-is-long-enough-for-better-auth'

const container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
  .withDatabase('csdr_auth_test')
  .withUsername('test')
  .withPassword('test')
  .start()

process.env.DATABASE_URL = container.getConnectionUri()

const migrationPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const migrationDb = drizzle(migrationPool)

await migrate(migrationDb, {
  migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
})

await migrationPool.end()

const { db } = await import('./lib/db')

beforeEach(async () => {
  const { rows } = await db.$client.query<{
    tablename: string
  }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('__drizzle_migrations', 'spatial_ref_sys')
  `)

  if (rows.length === 0) {
    return
  }

  const tableList = rows
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ')

  await db.execute(
    sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`),
  )
})

afterAll(async () => {
  await db.$client.end()
  await container.stop()
})
