import { apiKeyClient } from '@better-auth/api-key/client'
import { createAuthClient } from 'better-auth/client'
import {
  adminClient,
  anonymousClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { setCookieToHeader } from 'better-auth/cookies'
import { symmetricDecrypt } from 'better-auth/crypto'
import type { TestHelpers } from 'better-auth/plugins'
import { desc, eq, like } from 'drizzle-orm'
import { testClient } from 'hono/testing'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '~/app'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { twoFactor, user, verification } from '~/schemas/db'

const FRONTEND_ORIGIN = 'http://localhost:3000'

let test: TestHelpers

function createTestAuthClient(initialHeaders?: HeadersInit) {
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

function createAppClient(headers?: HeadersInit) {
  return testClient(
    app,
    {},
    undefined,
    headers
      ? {
          headers: Object.fromEntries(new Headers(headers).entries()),
        }
      : undefined,
  )
}

async function promoteToAdmin(email: string) {
  const record = await db.query.user.findFirst({
    where: eq(user.email, email),
  })

  if (!record) {
    throw new Error(`Expected user ${email} to exist`)
  }

  await db
    .update(user)
    .set({
      role: 'admin',
    })
    .where(eq(user.id, record.id))
}

async function latestVerification(pattern: string) {
  return db.query.verification.findFirst({
    where: like(verification.identifier, pattern),
    orderBy: desc(verification.createdAt),
  })
}

beforeAll(async () => {
  const ctx = await auth.$context
  test = ctx.test
})

describe('auth integration', () => {
  it('rejects privilege escalation during sign up', async () => {
    const { client } = createTestAuthClient()

    const result = await client.signUp.email({
      email: 'escalate@example.com',
      password: 'password123',
      name: 'Escalate',
      role: 'admin',
    } as never)

    expect(result.error?.status).toBe(400)
    expect(result.error?.message).toContain('role is not allowed to be set')
    expect(
      await db.query.user.findFirst({
        where: eq(user.email, 'escalate@example.com'),
      }),
    ).toBeUndefined()
  })

  it('signs users in and out through the auth client', async () => {
    const { client } = createTestAuthClient()

    const signUpResult = await client.signUp.email({
      email: 'session@example.com',
      password: 'password123',
      name: 'Test User',
    })

    expect(signUpResult.error).toBeNull()

    const sessionResult = await client.getSession()

    expect(sessionResult.error).toBeNull()
    expect(sessionResult.data).toMatchObject({
      user: { email: 'session@example.com' },
    })

    const signOutResult = await client.signOut()

    expect(signOutResult.error).toBeNull()
    expect(signOutResult.data).toEqual({ success: true })

    const afterSignOut = await client.getSession()

    expect(afterSignOut.error).toBeNull()
    expect(afterSignOut.data).toBeNull()
  })

  it('rejects invalid credentials', async () => {
    const { client: setupClient } = createTestAuthClient()

    const signUpResult = await setupClient.signUp.email({
      email: 'invalid-password@example.com',
      password: 'password123',
      name: 'Test User',
    })

    expect(signUpResult.error).toBeNull()

    const { client } = createTestAuthClient()
    const signInResult = await client.signIn.email({
      email: 'invalid-password@example.com',
      password: 'wrong-password',
    })

    expect(signInResult.error?.status).toBe(401)
    expect(signInResult.error?.message).toContain('Invalid email or password')
  })

  it('requests password resets and revokes existing sessions when the password is reset', async () => {
    const signedInClient = createTestAuthClient()

    const signUpResult = await signedInClient.client.signUp.email({
      email: 'reset@example.com',
      password: 'password123',
      name: 'Test User',
    })

    expect(signUpResult.error).toBeNull()

    const resetClient = createTestAuthClient()
    const resetRequestResult = await resetClient.client.requestPasswordReset({
      email: 'reset@example.com',
      redirectTo: `${FRONTEND_ORIGIN}/reset-password`,
    })

    expect(resetRequestResult.error).toBeNull()

    const resetVerification = await latestVerification('reset-password:%')

    expect(resetVerification).toBeDefined()

    const resetToken = resetVerification!.identifier.replace(
      'reset-password:',
      '',
    )
    const resetResult = await resetClient.client.resetPassword({
      token: resetToken,
      newPassword: 'new-password123',
    })

    expect(resetResult.error).toBeNull()
    expect(resetResult.data).toEqual({ status: true })

    const oldSessionResult = await signedInClient.client.getSession()
    expect(oldSessionResult.error).toBeNull()
    expect(oldSessionResult.data).toBeNull()

    const oldPasswordResult = await createTestAuthClient().client.signIn.email({
      email: 'reset@example.com',
      password: 'password123',
    })
    expect(oldPasswordResult.error?.status).toBe(401)

    const newPasswordResult = await createTestAuthClient().client.signIn.email({
      email: 'reset@example.com',
      password: 'new-password123',
    })
    expect(newPasswordResult.error).toBeNull()
    expect(newPasswordResult.data?.user.email).toBe('reset@example.com')
  })

  it('updates safe profile fields but rejects role escalation through update-user', async () => {
    const profileUser = await test.saveUser(
      test.createUser({
        email: 'profile@example.com',
        name: 'Original Name',
      }),
    )

    const headers = await test.getAuthHeaders({ userId: profileUser.id })
    const { client } = createTestAuthClient(headers)

    const updateResult = await client.updateUser({
      name: 'Updated Name',
    })

    expect(updateResult.error).toBeNull()
    expect(updateResult.data).toEqual({ status: true })

    const sessionResult = await client.getSession()

    expect(sessionResult.error).toBeNull()
    expect(sessionResult.data).toMatchObject({
      user: { name: 'Updated Name' },
    })

    const escalationResult = await client.updateUser({
      role: 'admin',
    } as never)

    expect(escalationResult.error?.status).toBe(400)
    expect(escalationResult.error?.message).toContain(
      'role is not allowed to be set',
    )
  })

  it('changes passwords through the authenticated endpoint', async () => {
    const { client } = createTestAuthClient()

    const signUpResult = await client.signUp.email({
      email: 'change-password@example.com',
      password: 'password123',
      name: 'Test User',
    })

    expect(signUpResult.error).toBeNull()

    const changePasswordResult = await client.changePassword({
      currentPassword: 'password123',
      newPassword: 'better-password123',
    })

    expect(changePasswordResult.error).toBeNull()
    expect(changePasswordResult.data).toMatchObject({
      token: null,
      user: {
        email: 'change-password@example.com',
      },
    })

    const oldPasswordResult = await createTestAuthClient().client.signIn.email({
      email: 'change-password@example.com',
      password: 'password123',
    })
    expect(oldPasswordResult.error?.status).toBe(401)

    const newPasswordResult = await createTestAuthClient().client.signIn.email({
      email: 'change-password@example.com',
      password: 'better-password123',
    })
    expect(newPasswordResult.error).toBeNull()
  })

  it('requires a second factor once TOTP is enabled and supports backup-code recovery', async () => {
    const email = 'two-factor@example.com'
    const password = 'password123'

    const primaryClient = createTestAuthClient()
    const signUpResult = await primaryClient.client.signUp.email({
      email,
      password,
      name: 'Test User',
    })

    expect(signUpResult.error).toBeNull()

    const enableResult = await primaryClient.client.twoFactor.enable({
      password,
    })

    expect(enableResult.error).toBeNull()
    expect(enableResult.data?.totpURI).toBeTruthy()
    expect(
      new URL(enableResult.data!.totpURI).searchParams.get('secret'),
    ).toBeTruthy()

    const twoFactorRecord = await db.query.twoFactor.findFirst({
      where: eq(
        twoFactor.userId,
        (await db.query.user.findFirst({
          where: eq(user.email, email),
        }))!.id,
      ),
    })

    expect(twoFactorRecord).toBeDefined()

    const initialTotpCode = await auth.api.generateTOTP({
      body: {
        secret: await symmetricDecrypt({
          key: process.env.BETTER_AUTH_SECRET!,
          data: twoFactorRecord!.secret,
        }),
      },
    })

    const verifyEnableResult = await primaryClient.client.twoFactor.verifyTotp({
      code: initialTotpCode.code,
    })

    expect(verifyEnableResult.error).toBeNull()

    const backupCodesResult =
      await primaryClient.client.twoFactor.generateBackupCodes({
        password,
      })

    expect(backupCodesResult.error).toBeNull()
    expect(backupCodesResult.data?.status).toBe(true)
    expect(backupCodesResult.data?.backupCodes.length).toBeGreaterThan(0)

    const backupCode = backupCodesResult.data?.backupCodes[0]

    expect(backupCode).toBeDefined()

    const challengeClient = createTestAuthClient()
    const challengeResult = await challengeClient.client.signIn.email({
      email,
      password,
    })

    expect(challengeResult.error).toBeNull()
    expect(challengeResult.data).toEqual({
      twoFactorRedirect: true,
    })

    const preVerificationSession = await challengeClient.client.getSession()

    expect(preVerificationSession.error).toBeNull()
    expect(preVerificationSession.data).toBeNull()

    const backupCodeVerification =
      await challengeClient.client.twoFactor.verifyBackupCode({
        code: backupCode!,
      })

    expect(backupCodeVerification.error).toBeNull()

    const postVerificationSession = await challengeClient.client.getSession()

    expect(postVerificationSession.error).toBeNull()
    expect(postVerificationSession.data).toMatchObject({
      user: { email },
    })

    const disableResult = await primaryClient.client.twoFactor.disable({
      password,
    })

    expect(disableResult.error).toBeNull()
    expect(disableResult.data).toEqual({ status: true })
  })

  it('allows API keys to authenticate after creation and invalidates them after deletion', async () => {
    const apiKeyUser = await test.saveUser(
      test.createUser({
        email: 'api-key@example.com',
      }),
    )

    const headers = await test.getAuthHeaders({ userId: apiKeyUser.id })
    const { client } = createTestAuthClient(headers)

    const createKeyResult = await client.apiKey.create({
      name: 'integration-test',
    })

    expect(createKeyResult.error).toBeNull()

    const listResponse = await createAppClient({
      'x-api-key': createKeyResult.data!.key,
    }).api.v0.dataset.$get({ query: {} })

    expect(listResponse.status).toBe(200)

    const deleteKeyResult = await client.apiKey.delete({
      keyId: createKeyResult.data!.id,
    })

    expect(deleteKeyResult.error).toBeNull()
    expect(deleteKeyResult.data).toEqual({ success: true })

    const deletedKeyResponse = await createAppClient({
      'x-api-key': createKeyResult.data!.key,
    }).api.v0.dataset.$get({ query: {} })

    expect(deletedKeyResponse.status).toBe(401)
  })

  it('enforces application resource authorization and admin auth endpoints', async () => {
    const adminEmail = 'admin@example.com'
    const userEmail = 'member@example.com'

    const adminUser = await test.saveUser(
      test.createUser({
        email: adminEmail,
      }),
    )
    await promoteToAdmin(adminEmail)

    const adminHeaders = await test.getAuthHeaders({
      userId: adminUser.id,
    })
    const adminClient = createTestAuthClient(adminHeaders).client

    const memberUser = await test.saveUser(
      test.createUser({
        email: userEmail,
      }),
    )
    const userHeaders = await test.getAuthHeaders({
      userId: memberUser.id,
    })
    const userClient = createTestAuthClient(userHeaders).client

    const unauthenticatedList = await createAppClient().api.v0.dataset.$get({
      query: {},
    })
    expect(unauthenticatedList.status).toBe(401)

    const userList = await createAppClient(userHeaders).api.v0.dataset.$get({
      query: {},
    })
    expect(userList.status).toBe(200)

    const forbiddenCreate = await createAppClient(
      userHeaders,
    ).api.v0.dataset.$post({
      json: {
        name: 'Forbidden dataset',
      },
    })
    expect(forbiddenCreate.status).toBe(403)

    const adminCreate = await createAppClient(
      adminHeaders,
    ).api.v0.dataset.$post({
      json: {
        name: 'Admin dataset',
      },
    })
    expect(adminCreate.status).toBe(201)

    const nonAdminCreateUser = await userClient.admin.createUser({
      email: 'created-by-admin@example.com',
      name: 'Created By Admin',
      password: 'password123',
    })
    expect(nonAdminCreateUser.error?.status).toBe(403)

    const adminCreateUser = await adminClient.admin.createUser({
      email: 'created-by-admin@example.com',
      name: 'Created By Admin',
      password: 'password123',
    })
    expect(adminCreateUser.error).toBeNull()

    expect(
      await db.query.user.findFirst({
        where: eq(user.email, 'created-by-admin@example.com'),
      }),
    ).toBeDefined()
  })
})
