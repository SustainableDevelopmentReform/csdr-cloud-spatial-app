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

let superAdmin = await db
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

console.log('Seeding end')
await client.end()
console.log('Connection closed')
