/* NOTE: this script should run one-time only, when first time create the app */

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/schemas/db'
import { isEmail } from '~/utils'
import { hashPassword } from 'better-auth/crypto'
import { env } from '../src/env'

export const client = new pg.Client({
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
})
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
  .where(eq(schema.organization.id, 'default-organization'))

if (defaultOrg.length > 0) {
  console.log('Default Organization already seeded, exiting...')
  process.exit(0)
}

defaultOrg = await db
  .insert(schema.organization)
  .values({
    id: 'default-organization',
    name: 'Default Organization',
    createdAt: new Date(),
    metadata: '{}',
  })
  .onConflictDoNothing()
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
  .returning()

console.log(`Account ID: ${account[0]!.id}`)

const variableCategory = await db
  .insert(schema.variableCategory)
  .values({
    id: 'forest',
    name: 'Forest Data',
    description: 'Forest Data',
  })
  .onConflictDoNothing()
  .returning()

console.log(`Variable Category ID: ${variableCategory[0]!.id}`)

const variable1 = await db
  .insert(schema.variable)
  .values({
    id: 'forest-cover-area',
    name: 'Forest Land Area',
    categoryId: variableCategory[0]!.id,
    description: 'Forest Land Area',
    unit: 'm^2',
    displayOrder: 1,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Variable ID: ${variable1[0]!.id}`)

const variable2 = await db
  .insert(schema.variable)
  .values({
    id: 'forest-cover-percentage',
    name: 'Forest Cover Percentage',
    categoryId: variableCategory[0]!.id,
    description: 'Forest Cover Percentage',
    unit: '%',
    displayOrder: 2,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Variable ID: ${variable2[0]!.id}`)

const dataset = await db
  .insert(schema.dataset)
  .values({
    id: 'forest-cover',
    name: 'Forest Cover',
    description: 'Some Forest Cover Data',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

console.log(`Dataset ID: ${dataset[0]!.id}`)
const datasetRun = await db
  .insert(schema.datasetRun)
  .values({
    id: 'forest-cover-run',
    name: 'forest-cover-run',
    datasetId: dataset[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

// Update mainRunId in dataset
await db
  .update(schema.dataset)
  .set({ mainRunId: datasetRun[0]!.id })
  .where(eq(schema.dataset.id, dataset[0]!.id))

console.log(`Dataset Run ID: ${datasetRun[0]!.id}`)

const geometries = await db
  .insert(schema.geometries)
  .values({
    id: 'australia-geometries',
    name: 'Australia Geometries',
    description: 'Australia Geometries',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

console.log(`Geometries ID: ${geometries[0]!.id}`)

const geometriesRun = await db
  .insert(schema.geometriesRun)
  .values({
    id: 'australia-geometries-run',
    name: 'australia-geometries-run',
    geometriesId: geometries[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

// Update mainRunId in geometries
await db
  .update(schema.geometries)
  .set({ mainRunId: geometriesRun[0]!.id })
  .where(eq(schema.geometries.id, geometries[0]!.id))

console.log(`Geometries Run ID: ${geometriesRun[0]!.id}`)

const geometryOutput1 = await db
  .insert(schema.geometryOutput)
  .values({
    id: 'australia-geometry-output-0-tasmania',
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
    name: 'Tasmania',
    properties: '{ "some": "properties" }',
  })
  .onConflictDoNothing()
  .returning()

console.log(`Geometry Output ID: ${geometryOutput1[0]!.id}`)

const geometryOutput2 = await db
  .insert(schema.geometryOutput)
  .values({
    id: 'australia-geometry-output-1-mainland',
    geometriesRunId: geometriesRun[0]!.id,
    name: 'Mainland',
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

console.log(`Geometry Output ID: ${geometryOutput2[0]!.id}`)

const product = await db
  .insert(schema.product)
  .values({
    id: 'forest-cover-product',
    name: 'Forest Cover Product in Australia',
    timePrecision: 'year',
    datasetId: dataset[0]!.id,
    geometriesId: geometries[0]!.id,
    description: 'Forest Cover Product in Australia',
    metadata: '{ "source": "https://example.com" }',
  })
  .onConflictDoNothing()
  .returning()

console.log(`Product ID: ${product[0]!.id}`)

const productRun = await db
  .insert(schema.productRun)
  .values({
    id: 'forest-cover-product-run',
    name: 'forest-cover-product-run',
    description: 'Forest Cover Product Run in Australia',
    productId: product[0]!.id,
    datasetRunId: datasetRun[0]!.id,
    geometriesRunId: geometriesRun[0]!.id,
    metadata: '{ "some product run": "parameters" }',
  })
  .onConflictDoNothing()
  .returning()

// Update mainRunId in product
await db
  .update(schema.product)
  .set({ mainRunId: productRun[0]!.id })
  .where(eq(schema.product.id, product[0]!.id))

console.log(`Product Run ID: ${productRun[0]!.id}`)

const productOutput1 = await db
  .insert(schema.productOutput)
  .values({
    id: 'forest-cover-product-output-0',
    name: 'forest-cover-product-output-0',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput1[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: 100,
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Product Output ID: ${productOutput1[0]!.id}`)

const productOutput2 = await db
  .insert(schema.productOutput)
  .values({
    id: 'forest-cover-product-output-1',
    name: 'forest-cover-product-output-1',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput1[0]!.id,
    timePoint: new Date('2022-01-01T00:00:00Z'),
    value: 200,
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Product Output ID: ${productOutput2[0]!.id}`)

const productOutput3 = await db
  .insert(schema.productOutput)
  .values({
    id: 'forest-cover-product-output-2',
    name: 'forest-cover-product-output-2',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput2[0]!.id,
    timePoint: new Date('2021-01-01T00:00:00Z'),
    value: 300,
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Product Output ID: ${productOutput3[0]!.id}`)

const productOutput4 = await db
  .insert(schema.productOutput)
  .values({
    id: 'forest-cover-product-output-3',
    name: 'forest-cover-product-output-3',
    productRunId: productRun[0]!.id,
    geometryOutputId: geometryOutput2[0]!.id,
    timePoint: new Date('2022-01-01T00:00:00Z'),
    value: 400,
    variableId: variable1[0]!.id,
  })
  .onConflictDoNothing()
  .returning()

console.log(`Product Output ID: ${productOutput4[0]!.id}`)

console.log('Seeding end')
await client.end()
console.log('Connection closed')
