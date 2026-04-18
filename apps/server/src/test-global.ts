import { PostgreSqlContainer } from '@testcontainers/postgresql'
import pg from 'pg'
import type { TestProject } from 'vitest/node'

type GlobalSetupContext = Pick<TestProject, 'provide'>

export default async function setup({ provide }: GlobalSetupContext) {
  const container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('csdr_auth_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  const databaseUrl = container.getConnectionUri()
  const client = new pg.Client({
    connectionString: databaseUrl,
  })

  await client.connect()
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;')
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
  } finally {
    await client.end()
  }

  provide('databaseUrl', databaseUrl)

  return async () => {
    await container.stop()
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}

export {}
