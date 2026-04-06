import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'
import { describe, expect, it } from 'vitest'
import { collectAccessControlMigrationReport } from '../../scripts/access-control-migration-report'
import { buildMigrationReportPayload } from '../../scripts/migrate'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle/', import.meta.url))
const ACCESS_CONTROL_MIGRATION_PREFIX = '0029_'
const LAST_PRE_ACCESS_CONTROL_MIGRATION = '0028_foamy_shriek.sql'

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`

const rewriteMigrationStatement = (
  statement: string,
  schemaName: string,
): string =>
  statement.replaceAll('"public".', `${quoteIdentifier(schemaName)}.`)

const stripExtensionStatements = (sql: string): string =>
  sql.replaceAll(/^\s*CREATE EXTENSION IF NOT EXISTS [^;]+;\s*$/gim, '')

const createSchemaName = (label: string): string =>
  `test_migrations_${label}_${randomUUID().replaceAll('-', '').slice(0, 12)}`

const listMigrationFiles = async (): Promise<string[]> => {
  const entries = await fs.readdir(MIGRATIONS_DIR)

  return entries.filter((entry) => entry.endsWith('.sql')).sort()
}

const applyMigrationFiles = async (
  client: pg.Client,
  schemaName: string,
  migrationFiles: string[],
): Promise<void> => {
  await client.query(
    `SET search_path TO ${quoteIdentifier(schemaName)}, public`,
  )
  await client.query(
    `SELECT set_config('csdr.access_control_bootstrap_organization_id', $1, false)`,
    ['csdr'],
  )
  await client.query(
    `SELECT set_config('csdr.access_control_bootstrap_user_id', $1, false)`,
    ['super-admin'],
  )

  for (const migrationFile of migrationFiles) {
    const rawSql = await fs.readFile(path.join(MIGRATIONS_DIR, migrationFile), {
      encoding: 'utf8',
    })
    const normalizedSql = stripExtensionStatements(rawSql)
    const statements = normalizedSql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      await client.query(rewriteMigrationStatement(statement, schemaName))
    }
  }
}

const withSchema = async (
  label: string,
  callback: (client: pg.Client, schemaName: string) => Promise<void>,
): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined in tests')
  }

  const schemaName = createSchemaName(label)
  const client = new pg.Client({
    connectionString: databaseUrl,
  })

  await client.connect()

  try {
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)
    await callback(client, schemaName)
  } finally {
    try {
      await client.query(
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`,
      )
    } finally {
      await client.end()
    }
  }
}

describe('database migrations', () => {
  it('does not create a bootstrap organization on a fresh database', async () => {
    await withSchema('fresh', async (client, schemaName) => {
      await applyMigrationFiles(client, schemaName, await listMigrationFiles())

      expect(
        await collectAccessControlMigrationReport({
          client,
          schemaName,
        }),
      ).toEqual({
        resourceUpdateCounts: {
          dashboard: 0,
          dataset: 0,
          derivedIndicator: 0,
          geometries: 0,
          indicator: 0,
          indicatorCategory: 0,
          product: 0,
          report: 0,
        },
        bootstrapOrganizationAssignmentCount: 0,
        bootstrapUserAssignmentCount: 0,
        noOp: true,
      })

      const organizationResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS "count" FROM ${quoteIdentifier(schemaName)}."organization"`,
      )

      expect(organizationResult.rows[0]?.count).toBe('0')
    })
  })

  it('creates bootstrap ownership only when legacy resources already exist', async () => {
    await withSchema('legacy', async (client, schemaName) => {
      const migrationFiles = await listMigrationFiles()
      const preAccessControlMigrations = migrationFiles.filter(
        (migrationFile) => migrationFile <= LAST_PRE_ACCESS_CONTROL_MIGRATION,
      )
      const accessControlMigrations = migrationFiles.filter((migrationFile) =>
        migrationFile.startsWith(ACCESS_CONTROL_MIGRATION_PREFIX),
      )

      await applyMigrationFiles(client, schemaName, preAccessControlMigrations)

      await client.query(
        `INSERT INTO ${quoteIdentifier(schemaName)}."dataset" ("id", "name") VALUES ('legacy-dataset', 'Legacy Dataset')`,
      )

      expect(
        await collectAccessControlMigrationReport({
          client,
          schemaName,
        }),
      ).toEqual({
        resourceUpdateCounts: {
          dashboard: 0,
          dataset: 1,
          derivedIndicator: 0,
          geometries: 0,
          indicator: 0,
          indicatorCategory: 0,
          product: 0,
          report: 0,
        },
        bootstrapOrganizationAssignmentCount: 1,
        bootstrapUserAssignmentCount: 1,
        noOp: false,
      })

      await applyMigrationFiles(client, schemaName, accessControlMigrations)

      const organizationResult = await client.query<{
        id: string
        slug: string
      }>(
        `SELECT "id", "slug" FROM ${quoteIdentifier(schemaName)}."organization" ORDER BY "id" ASC`,
      )
      const userResult = await client.query<{
        id: string
        role: string | null
      }>(
        `SELECT "id", "role" FROM ${quoteIdentifier(schemaName)}."user" ORDER BY "id" ASC`,
      )
      const datasetResult = await client.query<{
        organizationId: string
        createdByUserId: string
        visibility: string
      }>(
        `SELECT "organization_id" AS "organizationId", "created_by_user_id" AS "createdByUserId", "visibility" FROM ${quoteIdentifier(schemaName)}."dataset" WHERE "id" = 'legacy-dataset'`,
      )
      const memberResult = await client.query<{
        organizationId: string
        userId: string
        role: string
      }>(
        `SELECT "organization_id" AS "organizationId", "user_id" AS "userId", "role" FROM ${quoteIdentifier(schemaName)}."member"`,
      )

      expect(organizationResult.rows).toEqual([{ id: 'csdr', slug: 'csdr' }])
      expect(userResult.rows).toEqual([
        { id: 'super-admin', role: 'super_admin' },
      ])
      expect(datasetResult.rows).toEqual([
        {
          organizationId: 'csdr',
          createdByUserId: 'super-admin',
          visibility: 'private',
        },
      ])
      expect(memberResult.rows).toEqual([
        {
          organizationId: 'csdr',
          userId: 'super-admin',
          role: 'org_admin',
        },
      ])

      expect(
        await collectAccessControlMigrationReport({
          client,
          schemaName,
        }),
      ).toEqual({
        resourceUpdateCounts: {
          dashboard: 0,
          dataset: 0,
          derivedIndicator: 0,
          geometries: 0,
          indicator: 0,
          indicatorCategory: 0,
          product: 0,
          report: 0,
        },
        bootstrapOrganizationAssignmentCount: 0,
        bootstrapUserAssignmentCount: 0,
        noOp: true,
      })
    })
  })

  it('uses fallback organization and user records when bootstrap records do not exist', async () => {
    await withSchema('fallback', async (client, schemaName) => {
      const migrationFiles = await listMigrationFiles()
      const preAccessControlMigrations = migrationFiles.filter(
        (migrationFile) => migrationFile <= LAST_PRE_ACCESS_CONTROL_MIGRATION,
      )
      const accessControlMigrations = migrationFiles.filter((migrationFile) =>
        migrationFile.startsWith(ACCESS_CONTROL_MIGRATION_PREFIX),
      )

      await applyMigrationFiles(client, schemaName, preAccessControlMigrations)

      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schemaName)}."organization" (
            "id",
            "name",
            "slug",
            "created_at",
            "metadata"
          )
          VALUES (
            'fallback-org',
            'Fallback Org',
            'fallback-org',
            now(),
            '{}'::jsonb
          )
        `,
      )
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schemaName)}."user" (
            "id",
            "name",
            "email",
            "email_verified",
            "created_at",
            "updated_at",
            "role",
            "banned",
            "two_factor_enabled",
            "is_anonymous"
          )
          VALUES (
            'fallback-user',
            'Fallback User',
            'fallback-user@example.com',
            true,
            now(),
            now(),
            'user',
            false,
            false,
            false
          )
        `,
      )
      await client.query(
        `INSERT INTO ${quoteIdentifier(schemaName)}."dataset" ("id", "name") VALUES ('legacy-fallback-dataset', 'Legacy Fallback Dataset')`,
      )

      expect(
        await collectAccessControlMigrationReport({
          client,
          schemaName,
        }),
      ).toEqual({
        resourceUpdateCounts: {
          dashboard: 0,
          dataset: 1,
          derivedIndicator: 0,
          geometries: 0,
          indicator: 0,
          indicatorCategory: 0,
          product: 0,
          report: 0,
        },
        bootstrapOrganizationAssignmentCount: 1,
        bootstrapUserAssignmentCount: 1,
        noOp: false,
      })

      await applyMigrationFiles(client, schemaName, accessControlMigrations)

      const organizationResult = await client.query<{
        id: string
      }>(
        `SELECT "id" FROM ${quoteIdentifier(schemaName)}."organization" ORDER BY "id" ASC`,
      )
      const userResult = await client.query<{
        id: string
      }>(
        `SELECT "id" FROM ${quoteIdentifier(schemaName)}."user" ORDER BY "id" ASC`,
      )
      const datasetResult = await client.query<{
        organizationId: string
        createdByUserId: string
      }>(
        `SELECT "organization_id" AS "organizationId", "created_by_user_id" AS "createdByUserId" FROM ${quoteIdentifier(schemaName)}."dataset" WHERE "id" = 'legacy-fallback-dataset'`,
      )

      expect(organizationResult.rows.some((row) => row.id === 'csdr')).toBe(
        false,
      )
      expect(userResult.rows.some((row) => row.id === 'super-admin')).toBe(
        false,
      )
      expect(datasetResult.rows).toEqual([
        {
          organizationId: 'fallback-org',
          createdByUserId: 'fallback-user',
        },
      ])
    })
  })

  it('builds a structured JSON migration report payload', async () => {
    await withSchema('script-report', async (client, schemaName) => {
      await applyMigrationFiles(client, schemaName, await listMigrationFiles())

      const report = await collectAccessControlMigrationReport({
        client,
        schemaName,
      })

      expect(report).toEqual({
        resourceUpdateCounts: {
          dashboard: 0,
          dataset: 0,
          derivedIndicator: 0,
          geometries: 0,
          indicator: 0,
          indicatorCategory: 0,
          product: 0,
          report: 0,
        },
        bootstrapOrganizationAssignmentCount: 0,
        bootstrapUserAssignmentCount: 0,
        noOp: true,
      })

      expect(buildMigrationReportPayload(report)).toEqual({
        event: 'database_migrations_completed',
        report,
      })
    })
  })
})
