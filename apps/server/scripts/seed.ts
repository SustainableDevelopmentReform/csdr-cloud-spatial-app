/* NOTE: this script should run one-time only, when first time create the app */

import { hashPassword } from 'better-auth/crypto'
import { MultiPolygon } from 'geojson'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/schemas/db'
import { isEmail } from '~/utils'
import { env } from '../src/env'
import { geomFromGeoJSON } from '../src/schemas/customTypes'

function getRequiredEnvValue(
  value: string | undefined,
  errorMessage: string,
): string {
  if (!value) {
    throw new Error(errorMessage)
  }

  return value
}

function expectInsertedRow<T>(rows: T[], entityName: string): T {
  const row = rows[0]

  if (!row) {
    throw new Error(`Failed to insert ${entityName}`)
  }

  return row
}

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
    const initialUserEmail = getRequiredEnvValue(
      process.env.INITIAL_USER_EMAIL,
      'Please add INITIAL_USER_EMAIL on .env file',
    )
    const initialUserName = getRequiredEnvValue(
      process.env.INITIAL_USER_NAME,
      'Please add INITIAL_USER_NAME on .env file',
    )
    const initialUserPassword = getRequiredEnvValue(
      process.env.INITIAL_USER_PASSWORD,
      'Please add INITIAL_USER_PASSWORD on .env file',
    )

    if (!isEmail(initialUserEmail)) {
      throw new Error(
        'Looks like INITIAL_USER_EMAIL format is invalid, it should be an email',
      )
    }

    const existingDefaultOrganization = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.id, 'csdr'))

    if (existingDefaultOrganization.length > 0) {
      console.info(
        'Spatial Data Framework organization already exists. Skipping seed.',
      )
      return
    }

    const defaultOrg = expectInsertedRow(
      await db
        .insert(schema.organization)
        .values({
          id: 'csdr',
          slug: 'sdf',
          name: 'Spatial Data Framework',
          createdAt: new Date(),
          metadata: '{}',
        })
        .onConflictDoNothing()
        .returning(),
      'default organization',
    )

    const superAdmin = expectInsertedRow(
      await db
        .insert(schema.user)
        .values({
          id: 'super-admin',
          email: initialUserEmail,
          name: initialUserName,
          emailVerified: true,
          createdAt: new Date(),
          role: 'super_admin',
          banned: false,
          banReason: null,
          banExpires: null,
          twoFactorEnabled: false,
        })
        .onConflictDoNothing()
        .returning(),
      'super admin user',
    )

    await expectInsertedRow(
      await db
        .insert(schema.account)
        .values({
          id: 'super-admin-account',
          userId: superAdmin.id,
          providerId: 'credential',
          createdAt: new Date(),
          updatedAt: new Date(),
          accountId: 'super-admin',
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          password: await hashPassword(initialUserPassword),
        })
        .onConflictDoNothing()
        .returning(),
      'super admin account',
    )

    await expectInsertedRow(
      await db
        .insert(schema.member)
        .values({
          id: 'csdr-super-admin',
          organizationId: defaultOrg.id,
          userId: superAdmin.id,
          role: 'org_admin',
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning(),
      'super admin membership',
    )

    const indicatorCategory = expectInsertedRow(
      await db
        .insert(schema.indicatorCategory)
        .values({
          id: 'forest',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Forest Data',
          description: 'Forest Data',
        })
        .onConflictDoNothing()
        .returning(),
      'indicator category',
    )

    const indicator1 = expectInsertedRow(
      await db
        .insert(schema.indicator)
        .values({
          id: 'forest-cover-area',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Forest Land Area',
          categoryId: indicatorCategory.id,
          description: 'Forest Land Area',
          unit: 'm^2',
          displayOrder: 1,
        })
        .onConflictDoNothing()
        .returning(),
      'forest cover area indicator',
    )

    await expectInsertedRow(
      await db
        .insert(schema.indicator)
        .values({
          id: 'forest-cover-percentage',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Forest Cover Percentage',
          categoryId: indicatorCategory.id,
          description: 'Forest Cover Percentage',
          unit: '%',
          displayOrder: 2,
        })
        .onConflictDoNothing()
        .returning(),
      'forest cover percentage indicator',
    )

    const dataset = expectInsertedRow(
      await db
        .insert(schema.dataset)
        .values({
          id: 'forest-cover',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Forest Cover',
          description: 'Some Forest Cover Data',
          metadata: '{ "source": "https://example.com" }',
        })
        .onConflictDoNothing()
        .returning(),
      'dataset',
    )

    const datasetRun = expectInsertedRow(
      await db
        .insert(schema.datasetRun)
        .values({
          id: 'forest-cover-run',
          name: 'forest-cover-run',
          datasetId: dataset.id,
        })
        .onConflictDoNothing()
        .returning(),
      'dataset run',
    )

    await db
      .update(schema.dataset)
      .set({ mainRunId: datasetRun.id })
      .where(eq(schema.dataset.id, dataset.id))

    const geometries = expectInsertedRow(
      await db
        .insert(schema.geometries)
        .values({
          id: 'australia-geometries',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Australia Geometries',
          description: 'Australia Geometries',
          metadata: '{ "source": "https://example.com" }',
        })
        .onConflictDoNothing()
        .returning(),
      'geometries',
    )

    const geometriesRun = expectInsertedRow(
      await db
        .insert(schema.geometriesRun)
        .values({
          id: 'australia-geometries-run',
          name: 'australia-geometries-run',
          geometriesId: geometries.id,
        })
        .onConflictDoNothing()
        .returning(),
      'geometries run',
    )

    await db
      .update(schema.geometries)
      .set({ mainRunId: geometriesRun.id })
      .where(eq(schema.geometries.id, geometries.id))

    const geometryOutput1 = expectInsertedRow(
      await db
        .insert(schema.geometryOutput)
        .values({
          id: 'australia-geometry-output-0-tasmania',
          geometriesRunId: geometriesRun.id,
          geometry: geomFromGeoJSON({
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
          } satisfies MultiPolygon),
          name: 'Tasmania',
          properties: '{ "some": "properties" }',
        })
        .onConflictDoNothing()
        .returning(),
      'Tasmania geometry output',
    )

    const geometryOutput2 = expectInsertedRow(
      await db
        .insert(schema.geometryOutput)
        .values({
          id: 'australia-geometry-output-1-mainland',
          geometriesRunId: geometriesRun.id,
          name: 'Mainland',
          properties: '{ "some": "more", "properties": "here" }',
          geometry: geomFromGeoJSON({
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
                  [140.48285117808075, -18.371410051494465],
                  [132.1340486703408, -12.293151503029364],
                  [113.91654528664822, -22.478860342629858],
                ],
              ],
            ],
          } satisfies MultiPolygon),
        })
        .onConflictDoNothing()
        .returning(),
      'Mainland geometry output',
    )

    const product = expectInsertedRow(
      await db
        .insert(schema.product)
        .values({
          id: 'forest-cover-product',
          organizationId: defaultOrg.id,
          createdByUserId: superAdmin.id,
          name: 'Forest Cover Product in Australia',
          datasetId: dataset.id,
          geometriesId: geometries.id,
          description: 'Forest Cover Product in Australia',
          metadata: '{ "source": "https://example.com" }',
        })
        .onConflictDoNothing()
        .returning(),
      'product',
    )

    const productRun = expectInsertedRow(
      await db
        .insert(schema.productRun)
        .values({
          id: 'forest-cover-product-run',
          name: 'forest-cover-product-run',
          description: 'Forest Cover Product Run in Australia',
          productId: product.id,
          datasetRunId: datasetRun.id,
          geometriesRunId: geometriesRun.id,
          metadata: '{ "some product run": "parameters" }',
        })
        .onConflictDoNothing()
        .returning(),
      'product run',
    )

    await db
      .update(schema.product)
      .set({ mainRunId: productRun.id })
      .where(eq(schema.product.id, product.id))

    await expectInsertedRow(
      await db
        .insert(schema.productOutput)
        .values({
          id: 'forest-cover-product-output-0',
          name: 'forest-cover-product-output-0',
          productRunId: productRun.id,
          geometryOutputId: geometryOutput1.id,
          timePoint: new Date('2021-01-01T00:00:00Z'),
          value: 100,
          indicatorId: indicator1.id,
        })
        .onConflictDoNothing()
        .returning(),
      '2021 Tasmania product output',
    )

    await expectInsertedRow(
      await db
        .insert(schema.productOutput)
        .values({
          id: 'forest-cover-product-output-1',
          name: 'forest-cover-product-output-1',
          productRunId: productRun.id,
          geometryOutputId: geometryOutput1.id,
          timePoint: new Date('2022-01-01T00:00:00Z'),
          value: 200,
          indicatorId: indicator1.id,
        })
        .onConflictDoNothing()
        .returning(),
      '2022 Tasmania product output',
    )

    await expectInsertedRow(
      await db
        .insert(schema.productOutput)
        .values({
          id: 'forest-cover-product-output-2',
          name: 'forest-cover-product-output-2',
          productRunId: productRun.id,
          geometryOutputId: geometryOutput2.id,
          timePoint: new Date('2021-01-01T00:00:00Z'),
          value: 300,
          indicatorId: indicator1.id,
        })
        .onConflictDoNothing()
        .returning(),
      '2021 Mainland product output',
    )

    await expectInsertedRow(
      await db
        .insert(schema.productOutput)
        .values({
          id: 'forest-cover-product-output-3',
          name: 'forest-cover-product-output-3',
          productRunId: productRun.id,
          geometryOutputId: geometryOutput2.id,
          timePoint: new Date('2022-01-01T00:00:00Z'),
          value: 400,
          indicatorId: indicator1.id,
        })
        .onConflictDoNothing()
        .returning(),
      '2022 Mainland product output',
    )

    console.info(
      `Database seed completed for organization ${defaultOrg.id} with admin ${superAdmin.email}.`,
    )
  } finally {
    await client.end()
  }
}

void main()
