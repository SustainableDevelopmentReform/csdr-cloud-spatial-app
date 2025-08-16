/* NOTE: this script should run one-time only, when first time create the app */

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/schemas'
import { isEmail } from '~/utils'
import { hashPassword } from 'better-auth/crypto'

export const client = new pg.Client(process.env.DATABASE_URL)
console.log('Connect to DB')
await client.connect()
export const db = drizzle(client, { schema })
console.log('Start seeding')

const initialUserEmail = process.env.INITIAL_USER_EMAIL
const initialUserName = process.env.INITIAL_USER_NAME
const initialUserPassword = process.env.INITIAL_USER_PASSWORD

if (!initialUserEmail) {
  throw new Error('Please add INITIAL_USER_EMAIL on .env file')
}

if (!initialUserName) {
  throw new Error('Please add INITIAL_USER_NAME on .env file')
}

if (!initialUserPassword) {
  throw new Error('Please add INITIAL_USER_PASSWORD on .env file')
}

if (!isEmail(initialUserEmail)) {
  throw new Error(
    'Looks like INITIAL_USER_EMAIL format is invalid, it should be an email',
  )
}

let defaultOrg = await db
  .select()
  .from(schema.organization)
  .where(eq(schema.organization.slug, 'default-organization'))

if (defaultOrg.length > 0) {
  console.log('Default Organization already seeded, exiting...')
  process.exit(0)
}

defaultOrg = await db
  .insert(schema.organization)
  .values({
    id: 'default-organization',
    name: 'Default Organization',
    slug: 'default-organization',
    createdAt: new Date(),
    metadata: '{}',
  })
  .returning()

console.log(`Default Organization ID: ${defaultOrg[0]!.id}`)

const superAdmin = await db
  .insert(schema.user)
  .values({
    id: 'super-admin',
    email: initialUserEmail,
    name: initialUserName,
    emailVerified: true,
    createdAt: new Date(),
    role: 'admin',
    banned: false,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: false,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Super Admin ID: ${superAdmin[0]!.id}`)

// create account for super admin
const account = await db
  .insert(schema.account)
  .values({
    id: 'super-admin-account',
    userId: superAdmin[0]!.id,
    providerId: 'email',
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
  .returning()

console.log(`Account ID: ${account[0]!.id}`)

const variableCategory = await db
  .insert(schema.variableCategory)
  .values({
    id: 'default-variable-category',
    name: 'Default Variable Category',
    description: 'Default Variable Category',
  })
  .onConflictDoNothing()
  .returning()

const variable1 = await db
  .insert(schema.variable)
  .values({
    id: 'default-variable-1',
    name: 'Default Variable',
    categoryId: variableCategory[0]!.id,
    description: 'Default Variable',
    unit: 'm',
    displayOrder: 1,
  })
  .onConflictDoNothing()
  .returning()

const variable2 = await db
  .insert(schema.variable)
  .values({
    id: 'default-variable-2',
    name: 'Default Variable 2',
    categoryId: variableCategory[0]!.id,
    description: 'Another Variable',
    unit: 'm/s',
    displayOrder: 2,
  })
  .onConflictDoNothing()
  .returning()

const dataset = await db
  .insert(schema.dataset)
  .values({
    id: 'default-dataset',
    name: 'Default Dataset',
    slug: 'default-dataset',
    description: 'Default Dataset',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

const datasetRun = await db
  .insert(schema.datasetRun)
  .values({
    id: 'default-dataset-run',
    datasetId: dataset[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

const geometries = await db
  .insert(schema.geometries)
  .values({
    id: 'default-geometries',
    name: 'Default Geometries',
    slug: 'default-geometries',
    description: 'Default Geometries',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

const geometriesRun = await db
  .insert(schema.geometriesRun)
  .values({
    id: 'default-geometries-run',
    geometriesId: geometries[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

const geometryOutput1 = await db
  .insert(schema.geometryOutput)
  .values({
    id: 'default-geometry-output-0',
    geometriesRunId: geometriesRun[0]!.id,
    geometry: {
      coordinates: [
        [
          [144.52849213046932, -40.95495671301414],
          [146.223447228792, -43.73394595871736],
          [148.42747998417815, -40.8715836482141],
          [144.52849213046932, -40.95495671301414],
        ],
      ],
      type: 'Polygon',
    },
    name: 'Default Geometry Output',
    properties: '{ "some": "properties" }',
  })
  .onConflictDoNothing()
  .returning()

const geometryOutput2 = await db
  .insert(schema.geometryOutput)
  .values({
    id: 'default-geometry-output-1',
    geometriesRunId: geometriesRun[0]!.id,
    name: 'Another Geometry Output',
    properties: '{ "some": "more", "properties": "here" }',
    geometry: {
      coordinates: [
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
      type: 'Polygon',
    },
  })
  .onConflictDoNothing()
  .returning()

const product = await db
  .insert(schema.product)
  .values({
    id: 'default-product',
    name: 'Default Product',
    slug: 'default-product',
    timePrecision: 'hour',
    datasetId: dataset[0]!.id,
    geometriesId: geometries[0]!.id,
    description: 'Default Product',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

const productRun = await db
  .insert(schema.productRun)
  .values({
    id: 'default-product-run',
    description: 'Default Product Run',
    productId: product[0]!.id,
    datasetRunId: datasetRun[0]!.id,
    geometriesRunId: geometriesRun[0]!.id,
    parameters: '{ "some product run": "parameters" }',
  })
  .onConflictDoNothing()
  .returning()

const productOutput1 = await db
  .insert(schema.productOutput)
  .values({
    id: 'default-product-output-0',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput1[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: '100',
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

const productOutput2 = await db
  .insert(schema.productOutput)
  .values({
    id: 'default-product-output-1',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput1[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: '200',
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

const productOutput3 = await db
  .insert(schema.productOutput)
  .values({
    id: 'default-product-output-0',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput2[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: '300',
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

const productOutput4 = await db
  .insert(schema.productOutput)
  .values({
    id: 'default-product-output-1',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput2[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: '400',
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

console.log('Seeding end')
await client.end()
console.log('Connection closed')
