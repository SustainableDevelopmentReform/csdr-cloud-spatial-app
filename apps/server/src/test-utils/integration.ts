import { apiKeyClient } from '@better-auth/api-key/client'
import { createAuthClient } from 'better-auth/client'
import {
  adminClient,
  anonymousClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { setCookieToHeader } from 'better-auth/cookies'
import { hashPassword } from 'better-auth/crypto'
import type { TestHelpers } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import * as schema from '~/schemas/db'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { hc } from 'hono/client'
import { testClient } from 'hono/testing'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import type { ApiRoutesType } from '~/app'

const FRONTEND_ORIGIN = 'http://localhost:3000'
const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle/', import.meta.url))

export const seededIds = {
  organization: 'csdr',
  adminUser: 'seed-admin',
  indicatorCategory: 'forest',
  indicator: 'forest-cover-area',
  derivedIndicator: 'forest-cover-area-double',
  dataset: 'forest-cover',
  datasetRun: 'forest-cover-run',
  geometries: 'australia-geometries',
  geometriesRun: 'australia-geometries-run',
  tasmaniaGeometryOutput: 'australia-geometries-run-tasmania',
  mainlandGeometryOutput: 'australia-geometries-run-mainland',
  product: 'forest-cover-product',
  productRun: 'forest-cover-product-run',
  productOutputTasmania2021: 'forest-cover-product-output-0',
  productOutputTasmania2022: 'forest-cover-product-output-1',
  productOutputMainland2021: 'forest-cover-product-output-2',
  productOutputMainland2022: 'forest-cover-product-output-3',
  report: 'forest-cover-report',
  dashboard: 'forest-cover-dashboard',
} as const

type AppModule = typeof import('~/app')
type AuthModule = typeof import('~/lib/auth')
type DbModule = typeof import('~/lib/db')

type IntegrationTestModules = {
  app: AppModule['default']
  auth: AuthModule['auth']
  db: DbModule['db']
}

type AppClient = ReturnType<typeof hc<ApiRoutesType>>

const createTypedAppClient = (
  app: ApiRoutesType,
  headers?: HeadersInit,
): AppClient =>
  testClient(
    app,
    {},
    undefined,
    headers
      ? {
          headers: Object.fromEntries(new Headers(headers).entries()),
        }
      : undefined,
  ) as AppClient

export type IntegrationTestContext = IntegrationTestModules & {
  schemaName: string
  createAppClient: (headers?: HeadersInit) => AppClient
  createTestAuthClient: (
    initialHeaders?: HeadersInit,
  ) => ReturnType<typeof createScopedAuthClient>
  getTestHelpers: () => TestHelpers
  createSessionHeaders: (options?: {
    email?: string
    name?: string
    role?: 'admin' | 'super_admin'
    organizationId?: string
    organizationRole?: 'org_viewer' | 'org_creator' | 'org_admin'
    twoFactorEnabled?: boolean
  }) => Promise<Headers>
}

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined in tests')
  }

  return databaseUrl
}

const createSchemaName = (fileUrl: string) => {
  const basename = path
    .basename(fileURLToPath(fileUrl))
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  const digest = createHash('sha1').update(fileUrl).digest('hex').slice(0, 10)
  const schemaName = `test_${basename}_${digest}`

  return schemaName.slice(0, 63)
}

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`

const listMigrationFiles = async () => {
  const entries = await fs.readdir(MIGRATIONS_DIR)

  return entries.filter((entry) => entry.endsWith('.sql')).sort()
}

const rewriteMigrationStatement = (statement: string, schemaName: string) =>
  statement.replaceAll('"public".', `${quoteIdentifier(schemaName)}.`)

const stripExtensionStatements = (sql: string) =>
  sql.replaceAll(/^\s*CREATE EXTENSION IF NOT EXISTS [^;]+;\s*$/gim, '')

const recreateSchema = async (schemaName: string) => {
  const client = new pg.Client({
    connectionString: getDatabaseUrl(),
  })

  await client.connect()

  try {
    await client.query(
      `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`,
    )
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)
    await client.query(
      `SET search_path TO ${quoteIdentifier(schemaName)}, public`,
    )

    const migrationFiles = await listMigrationFiles()
    for (const migrationFile of migrationFiles) {
      const rawSql = await fs.readFile(
        path.join(MIGRATIONS_DIR, migrationFile),
        'utf8',
      )
      const normalizedSql = stripExtensionStatements(rawSql)

      const statements = normalizedSql
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean)

      for (const statement of statements) {
        await client.query(rewriteMigrationStatement(statement, schemaName))
      }
    }
  } finally {
    await client.end()
  }
}

const truncateSchemaTables = async (db: DbModule['db'], schemaName: string) => {
  const { rows } = await db.$client.query<{ tablename: string }>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = $1
    `,
    [schemaName],
  )

  if (rows.length === 0) {
    return
  }

  const tableList = rows
    .map(
      ({ tablename }) =>
        `${quoteIdentifier(schemaName)}.${quoteIdentifier(tablename)}`,
    )
    .join(', ')

  await db.$client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)
}

const seedBaseData = async (db: DbModule['db']) => {
  const now = new Date('2025-01-01T00:00:00.000Z')
  const timePoint2021 = new Date('2021-01-01T00:00:00.000Z')
  const timePoint2022 = new Date('2022-01-01T00:00:00.000Z')

  await db
    .insert(schema.organization)
    .values({
      id: seededIds.organization,
      slug: 'csdr',
      name: 'CSDR',
      createdAt: now,
      metadata: '{}',
    })
    .onConflictDoNothing()

  await db.insert(schema.user).values({
    id: seededIds.adminUser,
    email: 'seed-admin@example.com',
    name: 'Seed Admin',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    role: 'super_admin',
    banned: false,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: false,
  })

  await db.insert(schema.member).values({
    id: 'seed-admin-member',
    organizationId: seededIds.organization,
    userId: seededIds.adminUser,
    role: 'org_admin',
    createdAt: now,
  })

  await db.insert(schema.account).values({
    id: 'seed-admin-account',
    userId: seededIds.adminUser,
    providerId: 'credential',
    createdAt: now,
    updatedAt: now,
    accountId: seededIds.adminUser,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    password: await hashPassword('password123'),
  })

  await db.insert(schema.indicatorCategory).values({
    id: seededIds.indicatorCategory,
    name: 'Forest Data',
    description: 'Forest Data',
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    parentId: null,
    displayOrder: 1,
  })

  await db.insert(schema.indicator).values({
    id: seededIds.indicator,
    name: 'Forest Land Area',
    categoryId: seededIds.indicatorCategory,
    description: 'Forest Land Area',
    unit: 'm^2',
    displayOrder: 1,
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.derivedIndicator).values({
    id: seededIds.derivedIndicator,
    name: 'Forest Land Area Double',
    categoryId: seededIds.indicatorCategory,
    description: 'Twice the forest land area',
    unit: 'm^2',
    displayOrder: 2,
    expression: '$1 * 2',
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.derivedIndicatorToIndicator).values({
    derivedIndicatorId: seededIds.derivedIndicator,
    indicatorId: seededIds.indicator,
  })

  await db.insert(schema.dataset).values({
    id: seededIds.dataset,
    name: 'Forest Cover',
    description: 'Some Forest Cover Data',
    metadata: { source: 'https://example.com/datasets/forest-cover' },
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    sourceUrl: 'https://example.com/datasets/forest-cover',
    sourceMetadataUrl: 'https://example.com/datasets/forest-cover/metadata',
    mainRunId: null,
  })

  await db.insert(schema.datasetRun).values({
    id: seededIds.datasetRun,
    name: 'forest-cover-run',
    description: 'Forest cover source run',
    metadata: null,
    createdAt: now,
    updatedAt: now,
    datasetId: seededIds.dataset,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataType: 'parquet',
    dataSize: null,
    dataEtag: null,
  })

  await db
    .update(schema.dataset)
    .set({ mainRunId: seededIds.datasetRun })
    .where(eq(schema.dataset.id, seededIds.dataset))

  await db.insert(schema.geometries).values({
    id: seededIds.geometries,
    name: 'Australia Geometries',
    description: 'Australia Geometries',
    metadata: { source: 'https://example.com/geometries/australia' },
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    sourceUrl: 'https://example.com/geometries/australia',
    sourceMetadataUrl: 'https://example.com/geometries/australia/metadata',
    mainRunId: null,
  })

  await db.insert(schema.geometriesRun).values({
    id: seededIds.geometriesRun,
    name: 'australia-geometries-run',
    description: 'Australia geometries source run',
    metadata: null,
    createdAt: now,
    updatedAt: now,
    geometriesId: seededIds.geometries,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataPmtilesUrl: null,
    dataType: 'geoparquet',
    dataSize: null,
    dataEtag: null,
  })

  await db
    .update(schema.geometries)
    .set({ mainRunId: seededIds.geometriesRun })
    .where(eq(schema.geometries.id, seededIds.geometries))

  await db.insert(schema.geometryOutput).values([
    {
      id: seededIds.tasmaniaGeometryOutput,
      geometriesRunId: seededIds.geometriesRun,
      name: 'Tasmania',
      description: 'Tasmania polygon',
      metadata: null,
      createdAt: now,
      updatedAt: now,
      properties: { localId: 'tasmania' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [144.52849213046932, -40.95495671301414],
              [146.223447228792, -43.73394595871736],
              [148.42747998417815, -40.8715836482141],
              [144.52849213046932, -40.95495671301414],
            ],
          ],
        ],
      },
    },
    {
      id: seededIds.mainlandGeometryOutput,
      geometriesRunId: seededIds.geometriesRun,
      name: 'Mainland',
      description: 'Mainland polygon',
      metadata: null,
      createdAt: now,
      updatedAt: now,
      properties: { localId: 'mainland' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [113.91654528664822, -22.478860342629858],
              [115.45777739767607, -34.89540695354741],
              [133.00840383872082, -31.983522634103515],
              [146.57387600530444, -38.824293461501256],
              [153.83198193148485, -29.571467919044437],
              [142.48849773032543, -10.873394815296393],
              [132.1340486703408, -12.293151503029364],
              [113.91654528664822, -22.478860342629858],
            ],
          ],
        ],
      },
    },
  ])

  await db.insert(schema.product).values({
    id: seededIds.product,
    name: 'Forest Cover Product in Australia',
    description: 'Forest Cover Product in Australia',
    metadata: { source: 'https://example.com/products/forest-cover' },
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    timePrecision: 'year',
    datasetId: seededIds.dataset,
    geometriesId: seededIds.geometries,
    mainRunId: null,
  })

  await db.insert(schema.productRun).values({
    id: seededIds.productRun,
    name: 'forest-cover-product-run',
    description: 'Forest Cover Product Run in Australia',
    metadata: { parameter: 'seeded' },
    createdAt: now,
    updatedAt: now,
    productId: seededIds.product,
    datasetRunId: seededIds.datasetRun,
    geometriesRunId: seededIds.geometriesRun,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataType: 'parquet',
    dataSize: null,
    dataEtag: null,
  })

  await db
    .update(schema.product)
    .set({ mainRunId: seededIds.productRun })
    .where(eq(schema.product.id, seededIds.product))

  await db.insert(schema.productOutput).values([
    {
      id: seededIds.productOutputTasmania2021,
      name: 'forest-cover-product-output-0',
      description: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      productRunId: seededIds.productRun,
      geometryOutputId: seededIds.tasmaniaGeometryOutput,
      timePoint: timePoint2021,
      value: 100,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    },
    {
      id: seededIds.productOutputTasmania2022,
      name: 'forest-cover-product-output-1',
      description: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      productRunId: seededIds.productRun,
      geometryOutputId: seededIds.tasmaniaGeometryOutput,
      timePoint: timePoint2022,
      value: 200,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    },
    {
      id: seededIds.productOutputMainland2021,
      name: 'forest-cover-product-output-2',
      description: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      productRunId: seededIds.productRun,
      geometryOutputId: seededIds.mainlandGeometryOutput,
      timePoint: timePoint2021,
      value: 300,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    },
    {
      id: seededIds.productOutputMainland2022,
      name: 'forest-cover-product-output-3',
      description: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      productRunId: seededIds.productRun,
      geometryOutputId: seededIds.mainlandGeometryOutput,
      timePoint: timePoint2022,
      value: 400,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    },
  ])

  await db.insert(schema.productOutputSummary).values({
    productRunId: seededIds.productRun,
    startTime: timePoint2021,
    endTime: timePoint2022,
    timePoints: [timePoint2021, timePoint2022],
    outputCount: 4,
    lastUpdated: now,
  })

  await db.insert(schema.productOutputSummaryIndicator).values({
    productRunId: seededIds.productRun,
    indicatorId: seededIds.indicator,
    derivedIndicatorId: null,
    minValue: 100,
    maxValue: 400,
    avgValue: 250,
    count: 4,
    lastUpdated: now,
  })

  await db.insert(schema.report).values({
    id: seededIds.report,
    name: 'Forest Cover Report',
    description: 'Seeded report for integration tests',
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Forest cover has been seeded for route tests.',
            },
          ],
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.dashboard).values({
    id: seededIds.dashboard,
    name: 'Forest Cover Dashboard',
    description: 'Seeded dashboard for integration tests',
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    content: {
      charts: {},
      layout: [],
    },
    createdAt: now,
    updatedAt: now,
  })
}

const createScopedAuthClient = (
  auth: AuthModule['auth'],
  initialHeaders?: HeadersInit,
) => {
  const sessionHeaders = new Headers(initialHeaders)
  const updateSessionCookies = setCookieToHeader(sessionHeaders)

  const client = createAuthClient({
    baseURL: 'http://localhost/api/auth',
    plugins: [
      adminClient(),
      twoFactorClient(),
      anonymousClient(),
      apiKeyClient(),
      organizationClient(),
    ],
    fetchOptions: {
      customFetchImpl: async (url, init) => {
        const headers = new Headers(sessionHeaders)

        new Headers(init?.headers).forEach((value, key) => {
          headers.set(key, value)
        })

        if ((init?.method ?? 'GET').toUpperCase() !== 'GET') {
          headers.set('origin', FRONTEND_ORIGIN)
        }

        const response = await auth.handler(
          new Request(url, {
            ...init,
            headers,
          }),
        )

        updateSessionCookies({ response })

        return response
      },
    },
  })

  return { client, headers: sessionHeaders }
}

export const setupIsolatedTestFile = async (
  fileUrl: string,
): Promise<IntegrationTestContext> => {
  const schemaName = createSchemaName(fileUrl)

  await recreateSchema(schemaName)

  vi.resetModules()
  process.env.DATABASE_SCHEMA = schemaName

  const [{ default: app }, { auth }, { db }] = await Promise.all([
    import('~/app'),
    import('~/lib/auth'),
    import('~/lib/db'),
  ])

  let testHelpers: TestHelpers | null = null

  beforeAll(async () => {
    const ctx = await auth.$context
    testHelpers = ctx.test
  })

  beforeEach(async () => {
    await truncateSchemaTables(db, schemaName)
    await seedBaseData(db)
  })

  afterEach(async () => {
    await truncateSchemaTables(db, schemaName)
  })

  afterAll(async () => {
    try {
      await truncateSchemaTables(db, schemaName)
    } finally {
      await db.$client.end()
      const client = new pg.Client({
        connectionString: getDatabaseUrl(),
      })

      await client.connect()
      try {
        await client.query(
          `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`,
        )
      } finally {
        await client.end()
      }
    }
  })

  return {
    schemaName,
    app,
    auth,
    db,
    createAppClient: (headers?: HeadersInit) =>
      createTypedAppClient(app as ApiRoutesType, headers),
    createTestAuthClient: (initialHeaders?: HeadersInit) =>
      createScopedAuthClient(auth, initialHeaders),
    getTestHelpers: () => {
      if (!testHelpers) {
        throw new Error('Test helpers are not ready yet')
      }

      return testHelpers
    },
    createSessionHeaders: async (options) => {
      const helpers = (() => {
        if (!testHelpers) {
          throw new Error('Test helpers are not ready yet')
        }

        return testHelpers
      })()
      const email =
        options?.email ?? `${randomUUID().replaceAll('-', '')}@example.com`
      const shouldEnableTwoFactor =
        options?.twoFactorEnabled ??
        (options?.role === 'admin' || options?.role === 'super_admin')
      const savedUser = await helpers.saveUser(
        helpers.createUser({
          email,
          name: options?.name ?? 'Test User',
          twoFactorEnabled: shouldEnableTwoFactor,
        }),
      )

      const organizationId = options?.organizationId ?? seededIds.organization

      if (organizationId !== seededIds.organization) {
        await db.insert(schema.organization).values({
          id: organizationId,
          slug: organizationId,
          name: `${options?.name ?? 'Test User'} Workspace`,
          createdAt: new Date(),
          metadata: '{}',
        })
      }

      await db.insert(schema.member).values({
        id: `member-${savedUser.id}`,
        organizationId,
        userId: savedUser.id,
        role: options?.organizationRole ?? 'org_viewer',
        createdAt: new Date(),
      })

      if (options?.role === 'admin') {
        await db
          .update(schema.user)
          .set({
            role: 'super_admin',
            twoFactorEnabled: shouldEnableTwoFactor,
          })
          .where(eq(schema.user.id, savedUser.id))
      } else if (options?.role === 'super_admin') {
        await db
          .update(schema.user)
          .set({
            role: 'super_admin',
            twoFactorEnabled: shouldEnableTwoFactor,
          })
          .where(eq(schema.user.id, savedUser.id))
      } else if (options?.twoFactorEnabled !== undefined) {
        await db
          .update(schema.user)
          .set({ twoFactorEnabled: options.twoFactorEnabled })
          .where(eq(schema.user.id, savedUser.id))
      }

      const headers = await helpers.getAuthHeaders({
        userId: savedUser.id,
      })

      await db
        .update(schema.session)
        .set({
          activeOrganizationId: organizationId,
        })
        .where(eq(schema.session.userId, savedUser.id))

      const scopedHeaders = new Headers(headers)
      scopedHeaders.set('x-csdr-active-organization-id', organizationId)

      return scopedHeaders
    },
  }
}
