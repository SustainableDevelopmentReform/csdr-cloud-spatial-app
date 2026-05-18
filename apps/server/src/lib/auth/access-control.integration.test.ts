process.env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC = 'true'

import { hashPassword } from 'better-auth/crypto'
import { eq, isNull } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  account,
  auditLog,
  dashboard,
  product,
  productRun,
  productOutputSummary,
  dataset,
  datasetRun,
  derivedIndicator,
  geometries,
  geometriesRun,
  indicator,
  indicatorCategory,
  report,
  reportIndicatorUsage,
  invitation,
  member,
  organization,
  apikey,
  session,
  user,
} from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from '~/test-utils/route-test-helpers'

const { app, createAppClient, createSessionHeaders, createTestAuthClient, db } =
  await setupIsolatedTestFile(import.meta.url)

let superAdminHeaders: Headers
let orgAdminHeaders: Headers
let creatorHeaders: Headers
let viewerHeaders: Headers

const requireValue = <T>(value: T | null | undefined, label: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`)
  }

  return value
}

const expectSingleRouteAuditLog = async (options: {
  requestPath: string
  requestMethod: string
  decision: 'allow' | 'deny'
  resourceType: string
  resourceId: string | null
  targetOrganizationId: string | null
  details: Record<string, unknown>
}) => {
  const logs = await db.query.auditLog.findMany({
    where: (table, { and, eq }) =>
      and(
        eq(table.requestPath, options.requestPath),
        eq(table.requestMethod, options.requestMethod),
        eq(table.decision, options.decision),
        eq(table.resourceType, options.resourceType),
        options.resourceId === null
          ? isNull(table.resourceId)
          : eq(table.resourceId, options.resourceId),
        options.targetOrganizationId === null
          ? isNull(table.targetOrganizationId)
          : eq(table.targetOrganizationId, options.targetOrganizationId),
      ),
  })

  expect(logs).toHaveLength(1)
  expect(logs[0]?.details).toMatchObject(options.details)
}

const FRONTEND_ORIGIN = 'http://localhost:3000'
const invitationIdListSchema = z.array(z.object({ id: z.string() }))
const fullOrganizationInvitationIdSchema = z.object({
  invitations: invitationIdListSchema.optional(),
})
const openApiDocumentSchema = z.object({
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
})

const createAuthPostHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('content-type', 'application/json')
  requestHeaders.set('origin', FRONTEND_ORIGIN)

  return requestHeaders
}

const createAuthGetHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('origin', FRONTEND_ORIGIN)

  return requestHeaders
}

type AccessPolicyGroup = {
  policy: string
  operations: string[]
}

type OpenApiOperation = {
  key: string
  method: string
  path: string
}

type AdminRouteSetupContext = {
  label: string
  targetUserId: string
}

type AdminRouteTargetSnapshot = {
  accountId: string
  accountPassword: string | null
  banExpiresTime: number | null
  banReason: string | null
  banned: boolean | null
  email: string
  name: string
  role: string | null
  sessionTokens: string[]
  userId: string
}

type AdminRouteScenarioState = {
  adminUserId: string
  createUserEmail: string
  initialTargetSnapshot: AdminRouteTargetSnapshot
  label: string
  targetAccountId: string
  targetEmail: string
  targetSessionToken: string
  targetUserId: string
}

type AdminRouteSecurityScenario = {
  expectAllowedState: (
    state: AdminRouteScenarioState,
    response: Response,
  ) => Promise<void>
  key: string
  prepare?: (context: AdminRouteSetupContext) => Promise<void>
  request: (
    state: AdminRouteScenarioState,
    headers?: HeadersInit,
  ) => Promise<Response>
}

type DeniedAdminActor = {
  headers?: HeadersInit
  label: string
}

const betterAuthAccessPolicyGroups: AccessPolicyGroup[] = [
  {
    policy: 'public-authentication',
    operations: [
      'GET /api/auth/callback/{id}',
      'GET /api/auth/delete-user/callback',
      'GET /api/auth/error',
      'GET /api/auth/ok',
      'GET /api/auth/reset-password/{token}',
      'GET /api/auth/verify-email',
      'POST /api/auth/callback/{id}',
      'POST /api/auth/refresh-token',
      'POST /api/auth/request-password-reset',
      'POST /api/auth/reset-password',
      'POST /api/auth/send-verification-email',
      'POST /api/auth/sign-in/anonymous',
      'POST /api/auth/sign-in/email',
      'POST /api/auth/sign-in/social',
      'POST /api/auth/sign-up/email',
      'POST /api/auth/two-factor/verify-backup-code',
      'POST /api/auth/two-factor/verify-otp',
      'POST /api/auth/two-factor/verify-totp',
    ],
  },
  {
    policy: 'authenticated-self',
    operations: [
      'GET /api/auth/account-info',
      'GET /api/auth/api-key/get',
      'GET /api/auth/api-key/list',
      'GET /api/auth/list-accounts',
      'GET /api/auth/list-sessions',
      'POST /api/auth/api-key/create',
      'POST /api/auth/api-key/delete',
      'POST /api/auth/api-key/update',
      'POST /api/auth/change-email',
      'POST /api/auth/change-password',
      'POST /api/auth/delete-anonymous-user',
      'POST /api/auth/delete-user',
      'POST /api/auth/get-access-token',
      'POST /api/auth/link-social',
      'POST /api/auth/revoke-other-sessions',
      'POST /api/auth/revoke-session',
      'POST /api/auth/revoke-sessions',
      'POST /api/auth/sign-out',
      'POST /api/auth/two-factor/disable',
      'POST /api/auth/two-factor/enable',
      'POST /api/auth/two-factor/generate-backup-codes',
      'POST /api/auth/two-factor/get-totp-uri',
      'POST /api/auth/two-factor/send-otp',
      'POST /api/auth/unlink-account',
      'POST /api/auth/update-session',
      'POST /api/auth/update-user',
      'POST /api/auth/verify-password',
    ],
  },
  {
    policy: 'super-admin-mfa',
    operations: [
      'GET /api/auth/admin/get-user',
      'GET /api/auth/admin/list-users',
      'POST /api/auth/admin/ban-user',
      'POST /api/auth/admin/create-user',
      'POST /api/auth/admin/has-permission',
      'POST /api/auth/admin/impersonate-user',
      'POST /api/auth/admin/list-user-sessions',
      'POST /api/auth/admin/remove-user',
      'POST /api/auth/admin/revoke-user-session',
      'POST /api/auth/admin/revoke-user-sessions',
      'POST /api/auth/admin/set-role',
      'POST /api/auth/admin/set-user-password',
      'POST /api/auth/admin/unban-user',
      'POST /api/auth/admin/update-user',
    ],
  },
  {
    policy: 'active-admin-impersonation-session',
    operations: ['POST /api/auth/admin/stop-impersonating'],
  },
  {
    policy: 'organization-member-read',
    operations: [
      'GET /api/auth/organization/get-active-member',
      'GET /api/auth/organization/get-active-member-role',
      'GET /api/auth/organization/list',
      'GET /api/auth/organization/list-members',
      'POST /api/auth/organization/has-permission',
      'POST /api/auth/organization/set-active',
    ],
  },
  {
    policy: 'organization-admin-mfa',
    operations: [
      'GET /api/auth/organization/get-full-organization',
      'GET /api/auth/organization/list-invitations',
      'POST /api/auth/organization/cancel-invitation',
      'POST /api/auth/organization/delete',
      'POST /api/auth/organization/invite-member',
      'POST /api/auth/organization/remove-member',
      'POST /api/auth/organization/update',
      'POST /api/auth/organization/update-member-role',
    ],
  },
  {
    policy: 'organization-recipient-invitation',
    operations: [
      'GET /api/auth/organization/get-invitation',
      'GET /api/auth/organization/list-user-invitations',
      'POST /api/auth/organization/accept-invitation',
      'POST /api/auth/organization/reject-invitation',
    ],
  },
  {
    policy: 'organization-disabled',
    operations: ['POST /api/auth/organization/create'],
  },
  {
    policy: 'organization-member-self',
    operations: ['POST /api/auth/organization/leave'],
  },
  {
    policy: 'organization-public-metadata',
    operations: ['POST /api/auth/organization/check-slug'],
  },
]

const customAdminAccessPolicyGroups: AccessPolicyGroup[] = [
  {
    policy: 'super-admin-mfa',
    operations: [
      'GET /api/v0/logs/audit/super-admin',
      'GET /api/v0/organization',
      'GET /api/v0/organization/invitations',
      'GET /api/v0/organization/members',
      'PATCH /api/v0/organization',
      'POST /api/v0/organization',
      'POST /api/v0/organization/active',
      'POST /api/v0/organization/add-member',
      'POST /api/v0/organization/cancel-invitation',
      'POST /api/v0/organization/invite',
      'POST /api/v0/organization/member-role',
      'POST /api/v0/organization/remove-member',
    ],
  },
]

const excludedBetterAuthAccessPolicyKeys = new Set([
  'GET /api/auth/get-session',
  'POST /api/auth/get-session',
])

const sortStrings = (values: string[]) => [...values].sort()

const accessPolicyOperationKeys = (groups: AccessPolicyGroup[]) =>
  groups.flatMap((group) => group.operations)

const isBetterAuthAdminOperationKey = (key: string): boolean =>
  key.startsWith('GET /api/auth/admin/') ||
  key.startsWith('POST /api/auth/admin/')

const isCustomAdminOperation = (operation: OpenApiOperation): boolean =>
  operation.path.startsWith('/api/v0/organization') ||
  operation.key === 'GET /api/v0/logs/audit/super-admin'

const expectNoDuplicateClassifications = (keys: string[]) => {
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index)

  expect(sortStrings(duplicateKeys)).toEqual([])
}

const operationFromKey = (key: string): OpenApiOperation => {
  const parts = key.split(' ')
  const method = parts[0]
  const path = parts[1]

  if (!method || !path) {
    throw new Error(`Invalid operation key: ${key}`)
  }

  return {
    key,
    method,
    path,
  }
}

const listOpenApiOperations = async (options: {
  path: string
  pathPrefix?: string
}): Promise<OpenApiOperation[]> => {
  const response = await app.request(options.path)
  expect(response.status).toBe(200)

  const document = openApiDocumentSchema.parse(await response.json())

  return Object.entries(document.paths).flatMap(([operationPath, methods]) =>
    Object.keys(methods).map((method) => {
      const normalizedMethod = method.toUpperCase()
      const normalizedPath = `${options.pathPrefix ?? ''}${operationPath}`

      return {
        key: `${normalizedMethod} ${normalizedPath}`,
        method: normalizedMethod,
        path: normalizedPath,
      }
    }),
  )
}

const requestAuthAdminOperation = async (
  operation: OpenApiOperation,
  headers?: HeadersInit,
): Promise<Response> => {
  if (operation.method === 'GET') {
    return await app.request(operation.path, {
      headers: createAuthGetHeaders(headers),
    })
  }

  return await app.request(operation.path, {
    method: operation.method,
    headers: createAuthPostHeaders(headers),
    body: JSON.stringify({}),
  })
}

const customAdminPathForOperation = (operation: OpenApiOperation): string => {
  if (
    operation.key === 'GET /api/v0/organization/invitations' ||
    operation.key === 'GET /api/v0/organization/members'
  ) {
    return `${operation.path}?organizationId=${seededIds.organization}`
  }

  return operation.path
}

const customAdminBodyForOperation = (
  operation: OpenApiOperation,
): Record<string, unknown> => {
  switch (operation.key) {
    case 'PATCH /api/v0/organization':
      return {
        name: 'Blocked Organization Update',
        organizationId: seededIds.organization,
      }
    case 'POST /api/v0/organization':
      return {
        name: 'Blocked Organization',
        slug: 'blocked-organization',
      }
    case 'POST /api/v0/organization/add-member':
      return {
        organizationId: seededIds.organization,
        role: 'org_viewer',
        userId: seededIds.adminUser,
      }
    case 'POST /api/v0/organization/cancel-invitation':
      return {
        invitationId: 'blocked-invitation',
        organizationId: seededIds.organization,
      }
    case 'POST /api/v0/organization/invite':
      return {
        email: 'blocked-invitee@example.com',
        organizationId: seededIds.organization,
        role: 'org_viewer',
      }
    case 'POST /api/v0/organization/member-role':
      return {
        memberId: 'blocked-member',
        organizationId: seededIds.organization,
        role: 'org_viewer',
      }
    case 'POST /api/v0/organization/remove-member':
      return {
        memberIdOrEmail: 'blocked-member',
        organizationId: seededIds.organization,
      }
    default:
      return {
        organizationId: seededIds.organization,
      }
  }
}

const requestCustomAdminOperation = async (
  operation: OpenApiOperation,
  headers?: HeadersInit,
): Promise<Response> => {
  if (operation.method === 'GET') {
    return await app.request(customAdminPathForOperation(operation), {
      headers: createAuthGetHeaders(headers),
    })
  }

  return await app.request(customAdminPathForOperation(operation), {
    method: operation.method,
    headers: createAuthPostHeaders(headers),
    body: JSON.stringify(customAdminBodyForOperation(operation)),
  })
}

const requestAdminGet = async (
  path: string,
  headers?: HeadersInit,
): Promise<Response> =>
  await app.request(path, {
    headers: createAuthGetHeaders(headers),
  })

const requestAdminPost = async (
  path: string,
  body: Record<string, unknown>,
  headers?: HeadersInit,
): Promise<Response> =>
  await app.request(path, {
    method: 'POST',
    headers: createAuthPostHeaders(headers),
    body: JSON.stringify(body),
  })

const loadSessionUserId = async (headers: Headers, label: string) => {
  const authClient = createTestAuthClient(headers)
  const sessionResult = await authClient.client.getSession()
  expect(sessionResult.error).toBeNull()

  return requireValue(sessionResult.data?.user.id, label)
}

const loadOrganizationMember = async (options: {
  label: string
  organizationId: string
  userId: string
}) => {
  const currentMember = await db.query.member.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.organizationId, options.organizationId),
        eq(table.userId, options.userId),
      ),
  })

  return requireValue(currentMember, options.label)
}

const loadSessionTokensForUser = async (userId: string): Promise<string[]> => {
  const sessions = await db.query.session.findMany({
    where: eq(session.userId, userId),
  })

  return sortStrings(sessions.map((currentSession) => currentSession.token))
}

const sanitizeAdminScenarioLabel = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized.length > 0 ? sanitized : 'admin-route'
}

const createTargetCredentialAccount = async (options: {
  accountId: string
  userId: string
}) => {
  const now = new Date('2025-01-01T00:00:00.000Z')

  await db.insert(account).values({
    id: options.accountId,
    accountId: options.userId,
    providerId: 'credential',
    userId: options.userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: await hashPassword('password123'),
    createdAt: now,
    updatedAt: now,
  })
}

const loadAdminRouteTargetSnapshot = async (options: {
  accountId: string
  userId: string
}): Promise<AdminRouteTargetSnapshot> => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, options.userId),
    }),
    'admin route target user',
  )
  const targetAccount = requireValue(
    await db.query.account.findFirst({
      where: eq(account.id, options.accountId),
    }),
    'admin route target account',
  )
  const sessionTokens = await loadSessionTokensForUser(options.userId)

  return {
    accountId: options.accountId,
    accountPassword: targetAccount.password,
    banExpiresTime: targetUser.banExpires?.getTime() ?? null,
    banReason: targetUser.banReason,
    banned: targetUser.banned,
    email: targetUser.email,
    name: targetUser.name,
    role: targetUser.role,
    sessionTokens,
    userId: targetUser.id,
  }
}

const expectAdminRouteTargetSnapshot = async (
  snapshot: AdminRouteTargetSnapshot,
) => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, snapshot.userId),
    }),
    'admin route persisted target user',
  )
  const targetAccount = requireValue(
    await db.query.account.findFirst({
      where: eq(account.id, snapshot.accountId),
    }),
    'admin route persisted target account',
  )

  expect(targetUser.email).toBe(snapshot.email)
  expect(targetUser.name).toBe(snapshot.name)
  expect(targetUser.role).toBe(snapshot.role)
  expect(targetUser.banned).toBe(snapshot.banned)
  expect(targetUser.banReason).toBe(snapshot.banReason)
  expect(targetUser.banExpires?.getTime() ?? null).toBe(snapshot.banExpiresTime)
  expect(targetAccount.password).toBe(snapshot.accountPassword)
  expect(await loadSessionTokensForUser(snapshot.userId)).toEqual(
    snapshot.sessionTokens,
  )
}

const createAdminRouteScenarioState = async (options: {
  label: string
  prepare?: (context: AdminRouteSetupContext) => Promise<void>
}): Promise<AdminRouteScenarioState> => {
  const label = sanitizeAdminScenarioLabel(options.label)
  const targetEmail = `${label}-target@example.com`
  const targetHeaders = await createSessionHeaders({
    email: targetEmail,
    organizationRole: 'org_viewer',
  })
  const targetUserId = await loadSessionUserId(
    targetHeaders,
    `${label} target user id`,
  )
  const targetAccountId = `${label}-target-account`
  await createTargetCredentialAccount({
    accountId: targetAccountId,
    userId: targetUserId,
  })

  if (options.prepare) {
    await options.prepare({
      label,
      targetUserId,
    })
  }

  const initialTargetSnapshot = await loadAdminRouteTargetSnapshot({
    accountId: targetAccountId,
    userId: targetUserId,
  })
  const targetSessionToken = requireValue(
    initialTargetSnapshot.sessionTokens[0],
    `${label} target session token`,
  )
  const adminUserId = await loadSessionUserId(
    superAdminHeaders,
    `${label} super admin user id`,
  )

  return {
    adminUserId,
    createUserEmail: `${label}-created@example.com`,
    initialTargetSnapshot,
    label,
    targetAccountId,
    targetEmail,
    targetSessionToken,
    targetUserId,
  }
}

const expectNoCreatedAdminRouteUser = async (
  state: AdminRouteScenarioState,
) => {
  const createdUser = await db.query.user.findFirst({
    where: eq(user.email, state.createUserEmail),
  })

  expect(createdUser).toBeUndefined()
}

const expectAdminRouteDeniedState = async (state: AdminRouteScenarioState) => {
  await expectAdminRouteTargetSnapshot(state.initialTargetSnapshot)
  await expectNoCreatedAdminRouteUser(state)
}

const expectAdminRouteTargetUnchanged = async (
  state: AdminRouteScenarioState,
) => {
  await expectAdminRouteTargetSnapshot(state.initialTargetSnapshot)
}

const expectCreatedAdminRouteUser = async (state: AdminRouteScenarioState) => {
  const createdUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.email, state.createUserEmail),
    }),
    'admin route created user',
  )
  const createdAccount = await db.query.account.findFirst({
    where: eq(account.userId, createdUser.id),
  })

  expect(createdUser.role).toBe('super_admin')
  expect(createdAccount?.password).toBeDefined()
  await expectAdminRouteTargetUnchanged(state)
}

const expectAdminRouteSetRole = async (state: AdminRouteScenarioState) => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, state.targetUserId),
    }),
    'admin route set-role target user',
  )

  expect(targetUser.role).toBe('super_admin')
}

const expectAdminRouteUpdatedUser = async (state: AdminRouteScenarioState) => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, state.targetUserId),
    }),
    'admin route update-user target user',
  )

  expect(targetUser.name).toBe(`Updated ${state.label}`)
}

const expectAdminRouteSetPassword = async (state: AdminRouteScenarioState) => {
  const targetAccount = requireValue(
    await db.query.account.findFirst({
      where: eq(account.id, state.targetAccountId),
    }),
    'admin route set-password target account',
  )

  expect(targetAccount.password).toBeDefined()
  expect(targetAccount.password).not.toBe(
    state.initialTargetSnapshot.accountPassword,
  )
}

const expectAdminRouteBannedUser = async (state: AdminRouteScenarioState) => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, state.targetUserId),
    }),
    'admin route banned target user',
  )

  expect(targetUser.banned).toBe(true)
  expect(targetUser.banReason).toBe('Admin route test ban')
  expect(await loadSessionTokensForUser(state.targetUserId)).toEqual([])
}

const expectAdminRouteUnbannedUser = async (state: AdminRouteScenarioState) => {
  const targetUser = requireValue(
    await db.query.user.findFirst({
      where: eq(user.id, state.targetUserId),
    }),
    'admin route unbanned target user',
  )

  expect(targetUser.banned).toBe(false)
  expect(targetUser.banReason).toBeNull()
  expect(targetUser.banExpires).toBeNull()
}

const expectAdminRouteImpersonatedUser = async (
  state: AdminRouteScenarioState,
) => {
  const targetSessions = await db.query.session.findMany({
    where: eq(session.userId, state.targetUserId),
  })

  expect(
    targetSessions.some(
      (targetSession) => targetSession.impersonatedBy === state.adminUserId,
    ),
  ).toBe(true)
}

const expectAdminRouteRevokedSession = async (
  state: AdminRouteScenarioState,
) => {
  const revokedSession = await db.query.session.findFirst({
    where: eq(session.token, state.targetSessionToken),
  })

  expect(revokedSession).toBeUndefined()
}

const expectAdminRouteRevokedSessions = async (
  state: AdminRouteScenarioState,
) => {
  expect(await loadSessionTokensForUser(state.targetUserId)).toEqual([])
}

const expectAdminRouteRemovedUser = async (state: AdminRouteScenarioState) => {
  const removedUser = await db.query.user.findFirst({
    where: eq(user.id, state.targetUserId),
  })
  const removedAccount = await db.query.account.findFirst({
    where: eq(account.id, state.targetAccountId),
  })

  expect(removedUser).toBeUndefined()
  expect(removedAccount).toBeUndefined()
  expect(await loadSessionTokensForUser(state.targetUserId)).toEqual([])
}

const adminPermissionCheckResponseSchema = z.object({
  error: z.string().nullable().optional(),
  success: z.boolean(),
})

const expectAdminRoutePermissionCheck = async (
  state: AdminRouteScenarioState,
  response: Response,
) => {
  const body = adminPermissionCheckResponseSchema.parse(await response.json())

  expect(body.success).toBe(true)
  await expectAdminRouteTargetUnchanged(state)
}

const betterAuthAdminStandardSecurityScenarios: AdminRouteSecurityScenario[] = [
  {
    key: 'GET /api/auth/admin/get-user',
    request: (state, headers) =>
      requestAdminGet(
        `/api/auth/admin/get-user?${new URLSearchParams({
          id: state.targetUserId,
        }).toString()}`,
        headers,
      ),
    expectAllowedState: expectAdminRouteTargetUnchanged,
  },
  {
    key: 'GET /api/auth/admin/list-users',
    request: (state, headers) =>
      requestAdminGet(
        `/api/auth/admin/list-users?${new URLSearchParams({
          searchField: 'email',
          searchValue: state.targetEmail,
        }).toString()}`,
        headers,
      ),
    expectAllowedState: expectAdminRouteTargetUnchanged,
  },
  {
    key: 'POST /api/auth/admin/ban-user',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/ban-user',
        {
          banReason: 'Admin route test ban',
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteBannedUser,
  },
  {
    key: 'POST /api/auth/admin/create-user',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/create-user',
        {
          email: state.createUserEmail,
          name: 'Created By Admin Route Test',
          password: 'password123',
          role: 'super_admin',
        },
        headers,
      ),
    expectAllowedState: expectCreatedAdminRouteUser,
  },
  {
    key: 'POST /api/auth/admin/has-permission',
    request: (_state, headers) =>
      requestAdminPost(
        '/api/auth/admin/has-permission',
        {
          permissions: {
            session: ['revoke'],
            user: ['create', 'delete'],
          },
        },
        headers,
      ),
    expectAllowedState: expectAdminRoutePermissionCheck,
  },
  {
    key: 'POST /api/auth/admin/impersonate-user',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/impersonate-user',
        {
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteImpersonatedUser,
  },
  {
    key: 'POST /api/auth/admin/list-user-sessions',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/list-user-sessions',
        {
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteTargetUnchanged,
  },
  {
    key: 'POST /api/auth/admin/remove-user',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/remove-user',
        {
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteRemovedUser,
  },
  {
    key: 'POST /api/auth/admin/revoke-user-session',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/revoke-user-session',
        {
          sessionToken: state.targetSessionToken,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteRevokedSession,
  },
  {
    key: 'POST /api/auth/admin/revoke-user-sessions',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/revoke-user-sessions',
        {
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteRevokedSessions,
  },
  {
    key: 'POST /api/auth/admin/set-role',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/set-role',
        {
          role: 'super_admin',
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteSetRole,
  },
  {
    key: 'POST /api/auth/admin/set-user-password',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/set-user-password',
        {
          newPassword: 'new-password123',
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteSetPassword,
  },
  {
    key: 'POST /api/auth/admin/unban-user',
    prepare: async ({ targetUserId }) => {
      await db
        .update(user)
        .set({
          banned: true,
          banExpires: new Date('2026-01-01T00:00:00.000Z'),
          banReason: 'Existing admin route test ban',
        })
        .where(eq(user.id, targetUserId))
    },
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/unban-user',
        {
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteUnbannedUser,
  },
  {
    key: 'POST /api/auth/admin/update-user',
    request: (state, headers) =>
      requestAdminPost(
        '/api/auth/admin/update-user',
        {
          data: {
            name: `Updated ${state.label}`,
          },
          userId: state.targetUserId,
        },
        headers,
      ),
    expectAllowedState: expectAdminRouteUpdatedUser,
  },
]

const stopImpersonatingAdminScenarioKey =
  'POST /api/auth/admin/stop-impersonating'

const betterAuthAdminSecurityScenarioKeys = [
  ...betterAuthAdminStandardSecurityScenarios.map((scenario) => scenario.key),
  stopImpersonatingAdminScenarioKey,
]

const createApiKeyDeniedActor = async (): Promise<DeniedAdminActor> => {
  const apiKeyOwnerHeaders = await createSessionHeaders({
    email: 'admin-route-api-key-owner@example.com',
    organizationRole: 'org_viewer',
  })
  const apiKeyResult = await createTestAuthClient(
    apiKeyOwnerHeaders,
  ).client.apiKey.create({
    name: 'admin-route-denied',
  })
  expect(apiKeyResult.error).toBeNull()

  const apiKeyHeaders = new Headers()
  apiKeyHeaders.set(
    'x-api-key',
    requireValue(apiKeyResult.data?.key, 'admin route denied api key'),
  )

  return {
    headers: apiKeyHeaders,
    label: 'api-key',
  }
}

const createImpersonatedDeniedActor = async (): Promise<DeniedAdminActor> => {
  const impersonatingAdminHeaders = await createSessionHeaders({
    email: 'admin-route-impersonating-admin@example.com',
    organizationRole: 'org_admin',
    role: 'super_admin',
  })
  const impersonatedTargetHeaders = await createSessionHeaders({
    email: 'admin-route-impersonated-target@example.com',
    organizationRole: 'org_viewer',
  })
  const impersonatedTargetUserId = await loadSessionUserId(
    impersonatedTargetHeaders,
    'admin route impersonated target user id',
  )
  const impersonatingClient = createTestAuthClient(impersonatingAdminHeaders)
  const impersonateResult =
    await impersonatingClient.client.admin.impersonateUser({
      userId: impersonatedTargetUserId,
    })
  expect(impersonateResult.error).toBeNull()

  return {
    headers: impersonatingClient.headers,
    label: 'impersonated-user',
  }
}

const createBetterAuthAdminDeniedActors = async (): Promise<
  DeniedAdminActor[]
> => {
  const noMfaSuperAdminHeaders = await createSessionHeaders({
    email: 'admin-route-no-mfa-super-admin@example.com',
    organizationRole: 'org_admin',
    role: 'super_admin',
    twoFactorEnabled: false,
  })

  return [
    {
      label: 'unauthenticated',
    },
    {
      headers: orgAdminHeaders,
      label: 'org-admin',
    },
    {
      headers: creatorHeaders,
      label: 'org-creator',
    },
    {
      headers: viewerHeaders,
      label: 'org-viewer',
    },
    {
      headers: noMfaSuperAdminHeaders,
      label: 'no-mfa-super-admin',
    },
    await createApiKeyDeniedActor(),
    await createImpersonatedDeniedActor(),
  ]
}

beforeEach(async () => {
  superAdminHeaders = await createSessionHeaders({
    email: 'super-admin@example.com',
    role: 'super_admin',
    organizationRole: 'org_admin',
  })
  orgAdminHeaders = await createSessionHeaders({
    email: 'org-admin@example.com',
    organizationRole: 'org_admin',
    twoFactorEnabled: true,
  })
  creatorHeaders = await createSessionHeaders({
    email: 'creator@example.com',
    organizationRole: 'org_creator',
  })
  viewerHeaders = await createSessionHeaders({
    email: 'viewer@example.com',
    organizationRole: 'org_viewer',
  })
})

describe('access control integration', () => {
  it('classifies every Better Auth route and custom admin route in the access policy inventory', async () => {
    const betterAuthOperations = (
      await listOpenApiOperations({
        path: '/api/auth/open-api/generate-schema',
        pathPrefix: '/api/auth',
      })
    ).filter(
      (operation) => !excludedBetterAuthAccessPolicyKeys.has(operation.key),
    )
    const betterAuthPolicyKeys = accessPolicyOperationKeys(
      betterAuthAccessPolicyGroups,
    )

    expectNoDuplicateClassifications(betterAuthPolicyKeys)
    expect(
      sortStrings(betterAuthOperations.map((operation) => operation.key)),
    ).toEqual(sortStrings(betterAuthPolicyKeys))
    expectNoDuplicateClassifications(betterAuthAdminSecurityScenarioKeys)
    expect(sortStrings(betterAuthAdminSecurityScenarioKeys)).toEqual(
      sortStrings(betterAuthPolicyKeys.filter(isBetterAuthAdminOperationKey)),
    )

    const customAdminPolicyKeys = accessPolicyOperationKeys(
      customAdminAccessPolicyGroups,
    )
    const customAdminOperations = (
      await listOpenApiOperations({
        path: '/api/v0/doc',
      })
    ).filter(isCustomAdminOperation)

    expectNoDuplicateClassifications(customAdminPolicyKeys)
    expect(
      sortStrings(customAdminOperations.map((operation) => operation.key)),
    ).toEqual(sortStrings(customAdminPolicyKeys))
  })

  it('denies Better Auth admin routes unless the caller is an MFA-verified super admin', async () => {
    const noMfaSuperAdminHeaders = await createSessionHeaders({
      email: 'better-auth-admin-no-mfa@example.com',
      role: 'super_admin',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })
    const adminOperations = accessPolicyOperationKeys(
      betterAuthAccessPolicyGroups,
    )
      .filter((key) => key.startsWith('GET /api/auth/admin/'))
      .concat(
        accessPolicyOperationKeys(betterAuthAccessPolicyGroups).filter((key) =>
          key.startsWith('POST /api/auth/admin/'),
        ),
      )
      .map(operationFromKey)

    for (const operation of adminOperations) {
      const unauthenticatedResponse = await requestAuthAdminOperation(operation)
      expect([401, 403]).toContain(unauthenticatedResponse.status)

      const orgAdminResponse = await requestAuthAdminOperation(
        operation,
        orgAdminHeaders,
      )
      if (operation.key === 'POST /api/auth/admin/stop-impersonating') {
        expect(orgAdminResponse.status).not.toBe(200)
      } else {
        expect(orgAdminResponse.status).toBe(403)
      }

      const noMfaSuperAdminResponse = await requestAuthAdminOperation(
        operation,
        noMfaSuperAdminHeaders,
      )
      expect(noMfaSuperAdminResponse.status).toBe(403)

      const superAdminResponse = await requestAuthAdminOperation(
        operation,
        superAdminHeaders,
      )
      expect([401, 403]).not.toContain(superAdminResponse.status)
    }
  })

  it('denies Better Auth admin routes with valid payloads for unauthorized callers without side effects', async () => {
    const deniedActors = await createBetterAuthAdminDeniedActors()

    for (const scenario of betterAuthAdminStandardSecurityScenarios) {
      for (const deniedActor of deniedActors) {
        const state = await createAdminRouteScenarioState({
          label: `${scenario.key}-${deniedActor.label}`,
          prepare: scenario.prepare,
        })
        const response = await scenario.request(state, deniedActor.headers)

        expect([401, 403]).toContain(response.status)
        await expectAdminRouteDeniedState(state)
      }
    }
  })

  it('allows MFA-verified super admins to call Better Auth admin routes with valid payloads', async () => {
    for (const scenario of betterAuthAdminStandardSecurityScenarios) {
      const state = await createAdminRouteScenarioState({
        label: `${scenario.key}-allowed`,
        prepare: scenario.prepare,
      })
      const response = await scenario.request(state, superAdminHeaders)

      expect(response.status).toBe(200)
      await scenario.expectAllowedState(state, response)
    }
  })

  it('rejects stop-impersonating unless the caller is in an active impersonation session', async () => {
    const noMfaSuperAdminHeaders = await createSessionHeaders({
      email: 'stop-impersonating-no-mfa-super-admin@example.com',
      organizationRole: 'org_admin',
      role: 'super_admin',
      twoFactorEnabled: false,
    })
    const apiKeyDeniedActor = await createApiKeyDeniedActor()
    const deniedActors: DeniedAdminActor[] = [
      {
        label: 'unauthenticated',
      },
      {
        headers: orgAdminHeaders,
        label: 'org-admin',
      },
      {
        headers: creatorHeaders,
        label: 'org-creator',
      },
      {
        headers: viewerHeaders,
        label: 'org-viewer',
      },
      {
        headers: noMfaSuperAdminHeaders,
        label: 'no-mfa-super-admin',
      },
      {
        headers: superAdminHeaders,
        label: 'non-impersonating-super-admin',
      },
      apiKeyDeniedActor,
    ]

    for (const deniedActor of deniedActors) {
      const actorUserId = deniedActor.headers
        ? await loadSessionUserId(
            new Headers(deniedActor.headers),
            `${deniedActor.label} user id`,
          )
        : null
      const sessionTokensBefore = actorUserId
        ? await loadSessionTokensForUser(actorUserId)
        : []
      const response = await requestAdminPost(
        '/api/auth/admin/stop-impersonating',
        {},
        deniedActor.headers,
      )

      expect(response.status).not.toBe(200)

      if (actorUserId) {
        expect(await loadSessionTokensForUser(actorUserId)).toEqual(
          sessionTokensBefore,
        )
      }
    }
  })

  it('allows stop-impersonating from a real impersonation session and restores the admin session', async () => {
    const impersonatingAdminHeaders = await createSessionHeaders({
      email: 'stop-impersonating-admin@example.com',
      organizationRole: 'org_admin',
      role: 'super_admin',
    })
    const impersonatingAdminUserId = await loadSessionUserId(
      impersonatingAdminHeaders,
      'stop impersonating admin user id',
    )
    const targetHeaders = await createSessionHeaders({
      email: 'stop-impersonating-target@example.com',
      organizationRole: 'org_viewer',
    })
    const targetUserId = await loadSessionUserId(
      targetHeaders,
      'stop impersonating target user id',
    )
    const impersonatingClient = createTestAuthClient(impersonatingAdminHeaders)
    const impersonateResult =
      await impersonatingClient.client.admin.impersonateUser({
        userId: targetUserId,
      })
    expect(impersonateResult.error).toBeNull()

    const impersonatedSession = requireValue(
      await db.query.session.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.userId, targetUserId),
            eq(table.impersonatedBy, impersonatingAdminUserId),
          ),
      }),
      'active impersonation session',
    )
    const response = await requestAdminPost(
      '/api/auth/admin/stop-impersonating',
      {},
      impersonatingClient.headers,
    )

    expect(response.status).toBe(200)

    const removedImpersonatedSession = await db.query.session.findFirst({
      where: eq(session.token, impersonatedSession.token),
    })
    expect(removedImpersonatedSession).toBeUndefined()
    expect(
      await loadSessionTokensForUser(impersonatingAdminUserId),
    ).not.toEqual([])
  })

  it('allows super admins to impersonate normal users but not other super admins', async () => {
    const impersonatingAdminHeaders = await createSessionHeaders({
      email: 'impersonate-admin-edge-actor@example.com',
      organizationRole: 'org_admin',
      role: 'super_admin',
    })
    const impersonatingAdminUserId = await loadSessionUserId(
      impersonatingAdminHeaders,
      'impersonate admin edge actor user id',
    )
    const normalTargetHeaders = await createSessionHeaders({
      email: 'impersonate-normal-target@example.com',
      organizationRole: 'org_viewer',
    })
    const normalTargetUserId = await loadSessionUserId(
      normalTargetHeaders,
      'normal impersonation target user id',
    )
    const normalResponse = await requestAdminPost(
      '/api/auth/admin/impersonate-user',
      {
        userId: normalTargetUserId,
      },
      impersonatingAdminHeaders,
    )

    expect(normalResponse.status).toBe(200)
    const normalTargetSessions = await db.query.session.findMany({
      where: eq(session.userId, normalTargetUserId),
    })
    expect(
      normalTargetSessions.some(
        (targetSession) =>
          targetSession.impersonatedBy === impersonatingAdminUserId,
      ),
    ).toBe(true)

    const superAdminTargetHeaders = await createSessionHeaders({
      email: 'impersonate-super-admin-target@example.com',
      organizationRole: 'org_admin',
      role: 'super_admin',
    })
    const superAdminTargetUserId = await loadSessionUserId(
      superAdminTargetHeaders,
      'super admin impersonation target user id',
    )
    const superAdminResponse = await requestAdminPost(
      '/api/auth/admin/impersonate-user',
      {
        userId: superAdminTargetUserId,
      },
      impersonatingAdminHeaders,
    )

    expect(superAdminResponse.status).toBe(403)
    const superAdminTargetSessions = await db.query.session.findMany({
      where: eq(session.userId, superAdminTargetUserId),
    })
    expect(
      superAdminTargetSessions.some(
        (targetSession) =>
          targetSession.impersonatedBy === impersonatingAdminUserId,
      ),
    ).toBe(false)
  })

  it('denies custom super-admin API routes to non-super-admin callers and super admins without MFA', async () => {
    const noMfaSuperAdminHeaders = await createSessionHeaders({
      email: 'custom-admin-no-mfa@example.com',
      role: 'super_admin',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })
    const operations = accessPolicyOperationKeys(
      customAdminAccessPolicyGroups,
    ).map(operationFromKey)

    for (const operation of operations) {
      const unauthenticatedResponse =
        await requestCustomAdminOperation(operation)
      expect(unauthenticatedResponse.status).toBe(401)

      const orgAdminResponse = await requestCustomAdminOperation(
        operation,
        orgAdminHeaders,
      )
      expect(orgAdminResponse.status).toBe(403)

      const noMfaSuperAdminResponse = await requestCustomAdminOperation(
        operation,
        noMfaSuperAdminHeaders,
      )
      expect(noMfaSuperAdminResponse.status).toBe(403)
    }
  })

  it('rejects self-service attempts to set privilege-bearing auth fields', async () => {
    const headers = await createSessionHeaders({
      email: 'self-service-escalation@example.com',
      organizationRole: 'org_viewer',
      twoFactorEnabled: false,
    })
    const currentUserId = await loadSessionUserId(
      headers,
      'self-service user id',
    )
    const originalUser = await db.query.user.findFirst({
      where: eq(user.id, currentUserId),
    })
    const originalSession = await db.query.session.findFirst({
      where: eq(session.userId, currentUserId),
    })

    const updateUserResponse = await app.request('/api/auth/update-user', {
      method: 'POST',
      headers: createAuthPostHeaders(headers),
      body: JSON.stringify({
        role: 'super_admin',
        twoFactorEnabled: true,
        userId: seededIds.adminUser,
      }),
    })
    expect(updateUserResponse.status).toBe(400)

    const updateSessionResponse = await app.request(
      '/api/auth/update-session',
      {
        method: 'POST',
        headers: createAuthPostHeaders(headers),
        body: JSON.stringify({
          activeOrganizationId: 'spoofed-organization',
          twoFactorVerified: true,
          userId: seededIds.adminUser,
        }),
      },
    )
    expect(updateSessionResponse.status).toBe(400)

    const persistedUser = await db.query.user.findFirst({
      where: eq(user.id, currentUserId),
    })
    const persistedSession = await db.query.session.findFirst({
      where: eq(session.userId, currentUserId),
    })

    expect(persistedUser?.role).toBe(originalUser?.role)
    expect(persistedUser?.twoFactorEnabled).toBe(originalUser?.twoFactorEnabled)
    expect(persistedSession?.activeOrganizationId).toBe(
      originalSession?.activeOrganizationId,
    )
    expect(persistedSession?.userId).toBe(currentUserId)
  })

  it('creates a personal organization and assigns the signup user as org_creator', async () => {
    const authClient = createTestAuthClient()

    const signUpResult = await authClient.client.signUp.email({
      email: 'personal-org@example.com',
      password: 'password123',
      name: 'Personal Org User',
    })

    expect(signUpResult.error).toBeNull()

    const sessionResult = await authClient.client.getSession()
    expect(sessionResult.error).toBeNull()
    const personalUser = await db.query.user.findFirst({
      where: eq(user.email, 'personal-org@example.com'),
    })
    expect(personalUser).toBeDefined()
    expect(personalUser?.role).not.toBe('super_admin')

    const personalMember = await db.query.member.findFirst({
      where: eq(
        member.userId,
        requireValue(personalUser?.id, 'personal user id'),
      ),
    })
    expect(personalMember?.role).toBe('org_creator')

    const personalOrganization = await db.query.organization.findFirst({
      where: eq(
        organization.id,
        requireValue(
          personalMember?.organizationId,
          'personal organization id',
        ),
      ),
    })
    expect(personalOrganization?.name).toContain("Personal Org User's")

    expect(sessionResult.data?.session.activeOrganizationId).toBe(
      personalOrganization?.id,
    )
  })

  it('enforces Better Auth organization management permissions by app organization role', async () => {
    const targetForRoleHeaders = await createSessionHeaders({
      email: 'auth-role-target@example.com',
      organizationRole: 'org_viewer',
    })
    const targetForRemoveHeaders = await createSessionHeaders({
      email: 'auth-remove-target@example.com',
      organizationRole: 'org_viewer',
    })
    const roleTargetUserId = await loadSessionUserId(
      targetForRoleHeaders,
      'role target user id',
    )
    const removeTargetUserId = await loadSessionUserId(
      targetForRemoveHeaders,
      'remove target user id',
    )
    const roleTargetMember = await loadOrganizationMember({
      label: 'role target member',
      organizationId: seededIds.organization,
      userId: roleTargetUserId,
    })
    const removeTargetMember = await loadOrganizationMember({
      label: 'remove target member',
      organizationId: seededIds.organization,
      userId: removeTargetUserId,
    })
    const originalOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, seededIds.organization),
    })

    for (const deniedActor of [
      {
        label: 'creator',
        headers: creatorHeaders,
      },
      {
        label: 'viewer',
        headers: viewerHeaders,
      },
    ]) {
      const updateOrganizationResponse = await app.request(
        '/api/auth/organization/update',
        {
          method: 'POST',
          headers: createAuthPostHeaders(deniedActor.headers),
          body: JSON.stringify({
            organizationId: seededIds.organization,
            data: {
              name: `Denied ${deniedActor.label} update`,
            },
          }),
        },
      )
      expect(updateOrganizationResponse.status).toBe(403)

      const inviteResponse = await app.request(
        '/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: createAuthPostHeaders(deniedActor.headers),
          body: JSON.stringify({
            email: `denied-${deniedActor.label}-invitee@example.com`,
            role: 'org_admin',
            organizationId: seededIds.organization,
          }),
        },
      )
      expect(inviteResponse.status).toBe(403)

      const invitationId = `denied-${deniedActor.label}-invitation`
      await db.insert(invitation).values({
        id: invitationId,
        organizationId: seededIds.organization,
        email: `pending-${deniedActor.label}@example.com`,
        role: 'org_viewer',
        status: 'pending',
        inviterId: seededIds.adminUser,
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      })

      const cancelInvitationResponse = await app.request(
        '/api/auth/organization/cancel-invitation',
        {
          method: 'POST',
          headers: createAuthPostHeaders(deniedActor.headers),
          body: JSON.stringify({
            invitationId,
          }),
        },
      )
      expect(cancelInvitationResponse.status).toBe(403)

      const listInvitationsResponse = await app.request(
        `/api/auth/organization/list-invitations?organizationId=${seededIds.organization}`,
        {
          headers: createAuthGetHeaders(deniedActor.headers),
        },
      )
      expect(listInvitationsResponse.status).toBe(403)

      const getFullOrganizationResponse = await app.request(
        `/api/auth/organization/get-full-organization?organizationId=${seededIds.organization}`,
        {
          headers: createAuthGetHeaders(deniedActor.headers),
        },
      )
      expect(getFullOrganizationResponse.status).toBe(403)

      const updateMemberRoleResponse = await app.request(
        '/api/auth/organization/update-member-role',
        {
          method: 'POST',
          headers: createAuthPostHeaders(deniedActor.headers),
          body: JSON.stringify({
            memberId: roleTargetMember.id,
            role: 'org_admin',
            organizationId: seededIds.organization,
          }),
        },
      )
      expect(updateMemberRoleResponse.status).toBe(403)

      const removeMemberResponse = await app.request(
        '/api/auth/organization/remove-member',
        {
          method: 'POST',
          headers: createAuthPostHeaders(deniedActor.headers),
          body: JSON.stringify({
            memberIdOrEmail: removeTargetMember.id,
            organizationId: seededIds.organization,
          }),
        },
      )
      expect([401, 403]).toContain(removeMemberResponse.status)
    }

    const persistedOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, seededIds.organization),
    })
    expect(persistedOrganization?.name).toBe(originalOrganization?.name)

    const persistedRoleTargetMember = await db.query.member.findFirst({
      where: eq(member.id, roleTargetMember.id),
    })
    expect(persistedRoleTargetMember?.role).toBe('org_viewer')

    const persistedRemoveTargetMember = await db.query.member.findFirst({
      where: eq(member.id, removeTargetMember.id),
    })
    expect(persistedRemoveTargetMember?.id).toBe(removeTargetMember.id)

    const deniedInvitationCount = await db.query.invitation.findMany({
      where: (table, { like }) =>
        like(table.email, 'denied-%-invitee@example.com'),
    })
    expect(deniedInvitationCount).toHaveLength(0)

    for (const deniedActor of ['creator', 'viewer']) {
      const persistedInvitation = await db.query.invitation.findFirst({
        where: eq(invitation.id, `denied-${deniedActor}-invitation`),
      })
      expect(persistedInvitation?.status).toBe('pending')
    }
  })

  it('allows MFA-verified org admins to manage Better Auth organization members and invitations', async () => {
    const roleTargetHeaders = await createSessionHeaders({
      email: 'auth-admin-role-target@example.com',
      organizationRole: 'org_viewer',
    })
    const removeTargetHeaders = await createSessionHeaders({
      email: 'auth-admin-remove-target@example.com',
      organizationRole: 'org_viewer',
    })
    const roleTargetUserId = await loadSessionUserId(
      roleTargetHeaders,
      'admin role target user id',
    )
    const removeTargetUserId = await loadSessionUserId(
      removeTargetHeaders,
      'admin remove target user id',
    )
    const roleTargetMember = await loadOrganizationMember({
      label: 'admin role target member',
      organizationId: seededIds.organization,
      userId: roleTargetUserId,
    })
    const removeTargetMember = await loadOrganizationMember({
      label: 'admin remove target member',
      organizationId: seededIds.organization,
      userId: removeTargetUserId,
    })

    const updateOrganizationResponse = await app.request(
      '/api/auth/organization/update',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          organizationId: seededIds.organization,
          data: {
            name: 'Better Auth Managed Organization',
          },
        }),
      },
    )
    expect(updateOrganizationResponse.status).toBe(200)

    const inviteResponse = await app.request(
      '/api/auth/organization/invite-member',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          email: 'auth-admin-invitee@example.com',
          role: 'org_creator',
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(inviteResponse.status).toBe(200)

    const createdInvitation = await db.query.invitation.findFirst({
      where: eq(invitation.email, 'auth-admin-invitee@example.com'),
    })
    expect(createdInvitation?.role).toBe('org_creator')

    const listInvitationsResponse = await app.request(
      `/api/auth/organization/list-invitations?organizationId=${seededIds.organization}`,
      {
        headers: createAuthGetHeaders(orgAdminHeaders),
      },
    )
    expect(listInvitationsResponse.status).toBe(200)
    const listedInvitations = invitationIdListSchema.parse(
      await listInvitationsResponse.json(),
    )
    expect(
      listedInvitations.some(
        (currentInvitation) => currentInvitation.id === createdInvitation?.id,
      ),
    ).toBe(true)

    const getFullOrganizationResponse = await app.request(
      '/api/auth/organization/get-full-organization?organizationSlug=sdf',
      {
        headers: createAuthGetHeaders(orgAdminHeaders),
      },
    )
    expect(getFullOrganizationResponse.status).toBe(200)
    const fullOrganization = fullOrganizationInvitationIdSchema.parse(
      await getFullOrganizationResponse.json(),
    )
    expect(
      fullOrganization.invitations?.some(
        (currentInvitation) => currentInvitation.id === createdInvitation?.id,
      ),
    ).toBe(true)

    const cancelInvitationResponse = await app.request(
      '/api/auth/organization/cancel-invitation',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          invitationId: requireValue(
            createdInvitation?.id,
            'created invitation id',
          ),
        }),
      },
    )
    expect(cancelInvitationResponse.status).toBe(200)

    const updateMemberRoleResponse = await app.request(
      '/api/auth/organization/update-member-role',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          memberId: roleTargetMember.id,
          role: 'org_creator',
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(updateMemberRoleResponse.status).toBe(200)

    const removeMemberResponse = await app.request(
      '/api/auth/organization/remove-member',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          memberIdOrEmail: removeTargetMember.id,
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(removeMemberResponse.status).toBe(200)

    const deleteOrganizationResponse = await app.request(
      '/api/auth/organization/delete',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(deleteOrganizationResponse.status).toBe(404)

    const persistedOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, seededIds.organization),
    })
    expect(persistedOrganization?.name).toBe('Better Auth Managed Organization')

    const persistedInvitation = await db.query.invitation.findFirst({
      where: eq(
        invitation.id,
        requireValue(createdInvitation?.id, 'persisted invitation id'),
      ),
    })
    expect(persistedInvitation?.status).toBe('canceled')

    const persistedRoleTargetMember = await db.query.member.findFirst({
      where: eq(member.id, roleTargetMember.id),
    })
    expect(persistedRoleTargetMember?.role).toBe('org_creator')

    const persistedRemoveTargetMember = await db.query.member.findFirst({
      where: eq(member.id, removeTargetMember.id),
    })
    expect(persistedRemoveTargetMember).toBeUndefined()
  })

  it('requires MFA for Better Auth organization management against the target organization role', async () => {
    const multiOrgHeaders = await createSessionHeaders({
      email: 'target-org-mfa@example.com',
      organizationRole: 'org_viewer',
      twoFactorEnabled: false,
    })
    const multiOrgUserId = await loadSessionUserId(
      multiOrgHeaders,
      'multi-org user id',
    )
    const targetOrganizationId = 'target-org-mfa-organization'

    await db.insert(organization).values({
      id: targetOrganizationId,
      slug: targetOrganizationId,
      name: 'Target Org MFA Organization',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      metadata: '{}',
    })
    await db.insert(member).values({
      id: 'target-org-mfa-admin-member',
      organizationId: targetOrganizationId,
      userId: multiOrgUserId,
      role: 'org_admin',
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
    })

    const updateOrganizationResponse = await app.request(
      '/api/auth/organization/update',
      {
        method: 'POST',
        headers: createAuthPostHeaders(multiOrgHeaders),
        body: JSON.stringify({
          organizationId: targetOrganizationId,
          data: {
            name: 'Should Not Persist Without MFA',
          },
        }),
      },
    )

    expect(updateOrganizationResponse.status).toBe(403)
    const persistedTargetOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, targetOrganizationId),
    })
    expect(persistedTargetOrganization?.name).toBe(
      'Target Org MFA Organization',
    )

    const noMfaAdminHeaders = await createSessionHeaders({
      email: 'auth-admin-no-mfa-management@example.com',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })
    const noMfaAdminUserId = await loadSessionUserId(
      noMfaAdminHeaders,
      'no MFA admin user id',
    )
    const noMfaRemoveTargetHeaders = await createSessionHeaders({
      email: 'auth-admin-no-mfa-remove-target@example.com',
      organizationRole: 'org_viewer',
    })
    const noMfaRemoveTargetUserId = await loadSessionUserId(
      noMfaRemoveTargetHeaders,
      'no MFA remove target user id',
    )
    const noMfaRemoveTargetMember = await loadOrganizationMember({
      label: 'no MFA remove target member',
      organizationId: seededIds.organization,
      userId: noMfaRemoveTargetUserId,
    })
    const noMfaInvitationId = 'auth-admin-no-mfa-invitation'
    await db.insert(invitation).values({
      id: noMfaInvitationId,
      organizationId: seededIds.organization,
      email: 'auth-admin-no-mfa-pending@example.com',
      role: 'org_viewer',
      status: 'pending',
      inviterId: seededIds.adminUser,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    })

    for (const request of [
      new Request(
        `http://localhost/api/auth/organization/list-invitations?organizationId=${seededIds.organization}`,
        {
          headers: createAuthGetHeaders(noMfaAdminHeaders),
        },
      ),
      new Request(
        'http://localhost/api/auth/organization/get-full-organization?organizationSlug=sdf',
        {
          headers: createAuthGetHeaders(noMfaAdminHeaders),
        },
      ),
      new Request('http://localhost/api/auth/organization/cancel-invitation', {
        method: 'POST',
        headers: createAuthPostHeaders(noMfaAdminHeaders),
        body: JSON.stringify({
          invitationId: noMfaInvitationId,
        }),
      }),
      new Request('http://localhost/api/auth/organization/remove-member', {
        method: 'POST',
        headers: createAuthPostHeaders(noMfaAdminHeaders),
        body: JSON.stringify({
          memberIdOrEmail: noMfaRemoveTargetMember.id,
          organizationId: seededIds.organization,
        }),
      }),
      new Request('http://localhost/api/auth/organization/update-member-role', {
        method: 'POST',
        headers: createAuthPostHeaders(noMfaAdminHeaders),
        body: JSON.stringify({
          memberId: noMfaRemoveTargetMember.id,
          role: 'org_creator',
          organizationId: seededIds.organization,
        }),
      }),
      new Request('http://localhost/api/auth/organization/delete', {
        method: 'POST',
        headers: createAuthPostHeaders(noMfaAdminHeaders),
        body: JSON.stringify({
          organizationId: seededIds.organization,
        }),
      }),
    ]) {
      const response = await app.request(request)
      expect(response.status).toBe(403)
    }

    const spoofedHeaderOrganizationId = 'auth-admin-no-mfa-viewer-org'
    await db.insert(organization).values({
      id: spoofedHeaderOrganizationId,
      slug: spoofedHeaderOrganizationId,
      name: 'Spoofed Header Viewer Organization',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
      metadata: '{}',
    })
    await db.insert(member).values({
      id: 'auth-admin-no-mfa-viewer-member',
      organizationId: spoofedHeaderOrganizationId,
      userId: noMfaAdminUserId,
      role: 'org_viewer',
      createdAt: new Date('2025-01-04T00:00:00.000Z'),
    })

    const spoofedHeaderRequestHeaders = createAuthPostHeaders(noMfaAdminHeaders)
    spoofedHeaderRequestHeaders.set(
      'x-sdf-active-organization-id',
      spoofedHeaderOrganizationId,
    )
    const spoofedHeaderResponse = await app.request(
      '/api/auth/organization/update-member-role',
      {
        method: 'POST',
        headers: spoofedHeaderRequestHeaders,
        body: JSON.stringify({
          memberId: noMfaRemoveTargetMember.id,
          role: 'org_creator',
        }),
      },
    )
    expect(spoofedHeaderResponse.status).toBe(403)

    const persistedNoMfaInvitation = await db.query.invitation.findFirst({
      where: eq(invitation.id, noMfaInvitationId),
    })
    expect(persistedNoMfaInvitation?.status).toBe('pending')

    const persistedNoMfaRemoveTargetMember = await db.query.member.findFirst({
      where: eq(member.id, noMfaRemoveTargetMember.id),
    })
    expect(persistedNoMfaRemoveTargetMember?.role).toBe('org_viewer')
  })

  it('keeps the last org admin from demoting, removing, or leaving themselves through Better Auth organization endpoints', async () => {
    const soloAdminOrganizationId = 'solo-auth-admin-organization'
    const soloAdminHeaders = await createSessionHeaders({
      email: 'solo-auth-admin@example.com',
      organizationId: soloAdminOrganizationId,
      organizationRole: 'org_admin',
      twoFactorEnabled: true,
    })
    const soloAdminUserId = await loadSessionUserId(
      soloAdminHeaders,
      'solo admin user id',
    )
    const soloAdminMember = await loadOrganizationMember({
      label: 'solo admin member',
      organizationId: soloAdminOrganizationId,
      userId: soloAdminUserId,
    })

    const demoteResponse = await app.request(
      '/api/auth/organization/update-member-role',
      {
        method: 'POST',
        headers: createAuthPostHeaders(soloAdminHeaders),
        body: JSON.stringify({
          memberId: soloAdminMember.id,
          role: 'org_viewer',
          organizationId: soloAdminOrganizationId,
        }),
      },
    )
    expect(demoteResponse.status).toBe(400)

    const removeResponse = await app.request(
      '/api/auth/organization/remove-member',
      {
        method: 'POST',
        headers: createAuthPostHeaders(soloAdminHeaders),
        body: JSON.stringify({
          memberIdOrEmail: soloAdminMember.id,
          organizationId: soloAdminOrganizationId,
        }),
      },
    )
    expect(removeResponse.status).toBe(400)

    const leaveResponse = await app.request('/api/auth/organization/leave', {
      method: 'POST',
      headers: createAuthPostHeaders(soloAdminHeaders),
      body: JSON.stringify({
        organizationId: soloAdminOrganizationId,
      }),
    })
    expect(leaveResponse.status).toBe(400)

    const persistedSoloAdminMember = await db.query.member.findFirst({
      where: eq(member.id, soloAdminMember.id),
    })
    expect(persistedSoloAdminMember?.role).toBe('org_admin')
  })

  it('allows only super admins to create organizations without creating a super-admin membership', async () => {
    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.organization.$post({
        json: {
          name: 'Blocked Organization',
          slug: 'blocked-organization',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
      },
    )

    const createdOrganization = await expectJsonResponse<{
      id: string
      memberCount: number
      name: string
      slug: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization.$post({
        json: {
          name: 'Managed Organization',
          slug: 'managed-organization',
        },
      }),
      {
        status: 201,
        message: 'Organization created',
      },
    )

    expect(createdOrganization.data.memberCount).toBe(0)

    const superAdminUser = await db.query.user.findFirst({
      where: eq(user.email, 'super-admin@example.com'),
    })

    const createdMembership = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, createdOrganization.data.id),
          eq(table.userId, requireValue(superAdminUser?.id, 'super admin id')),
        ),
    })

    expect(createdMembership).toBeUndefined()

    const organizationList = await expectJsonResponse<
      {
        id: string
        name: string
        slug: string
      }[]
    >(await createAppClient(superAdminHeaders).api.v0.organization.$get(), {
      status: 200,
      message: 'OK',
    })

    expect(
      organizationList.data.some(
        (currentOrganization) =>
          currentOrganization.slug === 'managed-organization',
      ),
    ).toBe(true)

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.organization.$get(),
      {
        status: 403,
        message: 'User is not authorized',
      },
    )

    const superAdminOrganizationListLog = await db.query.auditLog.findFirst({
      where: (table, { and, eq, isNull }) =>
        and(
          eq(table.requestPath, '/api/v0/organization'),
          eq(table.requestMethod, 'GET'),
          eq(table.resourceType, 'organization'),
          eq(table.action, 'list'),
          eq(table.decision, 'allow'),
          isNull(table.resourceId),
          isNull(table.targetOrganizationId),
        ),
    })
    expect(superAdminOrganizationListLog).toBeDefined()
    expect(superAdminOrganizationListLog?.activeOrganizationId).toBe(
      seededIds.organization,
    )

    const orgScopedOrganizationListLogs = await expectJsonResponse<{
      data: {
        requestPath: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          action: 'list',
          resourceType: 'organization',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(orgScopedOrganizationListLogs.data.data).toEqual([])

    const superAdminOrganizationListLogs = await expectJsonResponse<{
      data: {
        requestPath: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          action: 'list',
          resourceType: 'organization',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      superAdminOrganizationListLogs.data.data.some(
        (entry) =>
          entry.requestPath === '/api/v0/organization' &&
          entry.targetOrganizationId === null,
      ),
    ).toBe(true)
  })

  it('keeps domain resources and nulls user attribution when an account is hard-deleted', async () => {
    const ownerEmail = 'deleted-resource-owner@example.com'
    await createSessionHeaders({
      email: ownerEmail,
      organizationRole: 'org_creator',
    })

    const deletedOwner = await db.query.user.findFirst({
      where: eq(user.email, ownerEmail),
    })
    const deletedOwnerId = requireValue(
      deletedOwner?.id,
      'deleted owner user id',
    )
    const now = new Date('2025-04-01T00:00:00.000Z')

    await db
      .update(dataset)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(dataset.id, seededIds.dataset))
    await db
      .update(geometries)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(geometries.id, seededIds.geometries))
    await db
      .update(product)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(product.id, seededIds.product))
    await db
      .update(indicatorCategory)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(indicatorCategory.id, seededIds.indicatorCategory))
    await db
      .update(indicator)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(indicator.id, seededIds.indicator))
    await db
      .update(derivedIndicator)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(derivedIndicator.id, seededIds.derivedIndicator))
    await db
      .update(report)
      .set({
        createdByUserId: deletedOwnerId,
        publishedAt: now,
        publishedByUserId: deletedOwnerId,
        publishedPdfKey: 'reports/deleted-owner.pdf',
      })
      .where(eq(report.id, seededIds.report))
    await db
      .update(dashboard)
      .set({ createdByUserId: deletedOwnerId })
      .where(eq(dashboard.id, seededIds.dashboard))

    await db.insert(report).values({
      id: 'orphan-draft-report',
      name: 'Orphan Draft Report',
      description: null,
      content: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      organizationId: seededIds.organization,
      createdByUserId: deletedOwnerId,
      visibility: 'private',
    })

    await db.insert(auditLog).values({
      id: 'deleted-owner-audit-log',
      createdAt: now,
      actorUserId: deletedOwnerId,
      actorRole: 'user',
      activeOrganizationId: seededIds.organization,
      targetOrganizationId: seededIds.organization,
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      action: 'write',
      decision: 'allow',
      requestPath: '/test/deleted-owner/audit',
      requestMethod: 'POST',
      ipAddress: null,
      userAgent: null,
      details: null,
    })
    await db.insert(auditLog).values({
      id: 'deleted-owner-read-log',
      createdAt: now,
      actorUserId: deletedOwnerId,
      actorRole: 'user',
      activeOrganizationId: seededIds.organization,
      targetOrganizationId: seededIds.organization,
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      action: 'read',
      decision: 'allow',
      requestPath: '/test/deleted-owner/read',
      requestMethod: 'GET',
      ipAddress: null,
      userAgent: null,
      details: null,
    })

    const adminAuthClient = createTestAuthClient(superAdminHeaders)
    const deleteResult = await adminAuthClient.client.admin.removeUser({
      userId: deletedOwnerId,
    })

    expect(deleteResult.error).toBeNull()

    const retainedDataset = await db.query.dataset.findFirst({
      where: eq(dataset.id, seededIds.dataset),
    })
    const retainedGeometries = await db.query.geometries.findFirst({
      where: eq(geometries.id, seededIds.geometries),
    })
    const retainedProduct = await db.query.product.findFirst({
      where: eq(product.id, seededIds.product),
    })
    const retainedIndicatorCategory =
      await db.query.indicatorCategory.findFirst({
        where: eq(indicatorCategory.id, seededIds.indicatorCategory),
      })
    const retainedIndicator = await db.query.indicator.findFirst({
      where: eq(indicator.id, seededIds.indicator),
    })
    const retainedDerivedIndicator = await db.query.derivedIndicator.findFirst({
      where: eq(derivedIndicator.id, seededIds.derivedIndicator),
    })
    const retainedReport = await db.query.report.findFirst({
      where: eq(report.id, seededIds.report),
    })
    const retainedDraftReport = await db.query.report.findFirst({
      where: eq(report.id, 'orphan-draft-report'),
    })
    const retainedDashboard = await db.query.dashboard.findFirst({
      where: eq(dashboard.id, seededIds.dashboard),
    })
    const retainedAuditLog = await db.query.auditLog.findFirst({
      where: eq(auditLog.id, 'deleted-owner-audit-log'),
    })
    const retainedReadLog = await db.query.auditLog.findFirst({
      where: eq(auditLog.id, 'deleted-owner-read-log'),
    })

    expect(retainedDataset?.createdByUserId).toBeNull()
    expect(retainedGeometries?.createdByUserId).toBeNull()
    expect(retainedProduct?.createdByUserId).toBeNull()
    expect(retainedIndicatorCategory?.createdByUserId).toBeNull()
    expect(retainedIndicator?.createdByUserId).toBeNull()
    expect(retainedDerivedIndicator?.createdByUserId).toBeNull()
    expect(retainedReport?.createdByUserId).toBeNull()
    expect(retainedReport?.publishedByUserId).toBeNull()
    expect(retainedDraftReport?.createdByUserId).toBeNull()
    expect(retainedDashboard?.createdByUserId).toBeNull()
    expect(retainedAuditLog?.actorUserId).toBeNull()
    expect(retainedReadLog?.actorUserId).toBeNull()

    await expect(
      db.query.datasetRun.findFirst({
        where: eq(datasetRun.id, seededIds.datasetRun),
      }),
    ).resolves.toBeDefined()
    await expect(
      db.query.geometriesRun.findFirst({
        where: eq(geometriesRun.id, seededIds.geometriesRun),
      }),
    ).resolves.toBeDefined()
    await expect(
      db.query.productRun.findFirst({
        where: eq(productRun.id, seededIds.productRun),
      }),
    ).resolves.toBeDefined()

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'].$patch({
        param: { id: 'orphan-draft-report' },
        json: {
          name: 'Blocked Orphan Report Update',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
      },
    )
    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.dashboard[':id'].$patch({
        param: { id: seededIds.dashboard },
        json: {
          name: 'Blocked Orphan Dashboard Update',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.report[':id'].$patch({
        param: { id: 'orphan-draft-report' },
        json: {
          name: 'Admin Orphan Report Update',
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )
    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dashboard[':id'].$patch({
        param: { id: seededIds.dashboard },
        json: {
          name: 'Admin Orphan Dashboard Update',
        },
      }),
      {
        status: 200,
        message: 'Dashboard updated',
      },
    )
  })

  it('lets super admins list all organizations and activate an organization they do not already belong to', async () => {
    const superAdminAuth = createTestAuthClient(superAdminHeaders)
    const superAdminSession = await superAdminAuth.client.getSession()
    expect(superAdminSession.error).toBeNull()

    const detachedOrganizationId = 'detached-organization'
    await db.insert(organization).values({
      id: detachedOrganizationId,
      slug: detachedOrganizationId,
      name: 'Detached Organization',
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      metadata: '{}',
    })

    const superAdminUser = await db.query.user.findFirst({
      where: eq(user.email, 'super-admin@example.com'),
    })
    expect(superAdminUser).toBeDefined()

    const existingDetachedMembership = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, requireValue(superAdminUser?.id, 'super admin id')),
        ),
    })
    expect(existingDetachedMembership).toBeUndefined()

    const organizationList = await expectJsonResponse<
      {
        id: string
        slug: string
      }[]
    >(await createAppClient(superAdminHeaders).api.v0.organization.$get(), {
      status: 200,
      message: 'OK',
    })
    expect(
      organizationList.data.some(
        (currentOrganization) =>
          currentOrganization.id === detachedOrganizationId,
      ),
    ).toBe(true)

    await expectJsonResponse(
      await app.request('/api/v0/organization/active', {
        method: 'POST',
        headers: createAuthPostHeaders(superAdminHeaders),
        body: JSON.stringify({
          organizationId: detachedOrganizationId,
        }),
      }),
      {
        status: 200,
        message: 'Active organization updated',
      },
    )

    const createdDetachedMembership = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, requireValue(superAdminUser?.id, 'super admin id')),
        ),
    })
    expect(createdDetachedMembership).toBeUndefined()

    const persistedSession = await db.query.session.findFirst({
      where: eq(
        session.id,
        requireValue(
          superAdminSession.data?.session.id,
          'super admin session id',
        ),
      ),
    })
    expect(persistedSession?.activeOrganizationId).toBe(detachedOrganizationId)

    const refreshedSession = await superAdminAuth.client.getSession()
    expect(refreshedSession.error).toBeNull()
    expect(refreshedSession.data?.session.activeOrganizationId).toBe(
      detachedOrganizationId,
    )
  })

  it('lets super admins manage members and invitations in any organization without explicit membership', async () => {
    const detachedOrganizationId = 'super-admin-managed-organization'
    await db.insert(organization).values({
      id: detachedOrganizationId,
      slug: detachedOrganizationId,
      name: 'Super Admin Managed Organization',
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      metadata: '{}',
    })

    const superAdminUser = await db.query.user.findFirst({
      where: eq(user.email, 'super-admin@example.com'),
    })
    expect(superAdminUser).toBeDefined()

    const superAdminMembership = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, requireValue(superAdminUser?.id, 'super admin id')),
        ),
    })
    expect(superAdminMembership).toBeUndefined()

    const detachedMemberHeaders = await createSessionHeaders({
      email: 'detached-member@example.com',
    })
    const detachedMemberSession = await createTestAuthClient(
      detachedMemberHeaders,
    ).client.getSession()
    expect(detachedMemberSession.error).toBeNull()

    const detachedMemberId = requireValue(
      detachedMemberSession.data?.user.id,
      'detached member user id',
    )

    await db.insert(member).values({
      id: 'super-admin-managed-member',
      organizationId: detachedOrganizationId,
      userId: detachedMemberId,
      role: 'org_viewer',
      createdAt: new Date('2025-02-02T00:00:00.000Z'),
    })

    const listedMembers = await expectJsonResponse<{
      members: {
        id: string
        organizationId: string
        role: string
        userId: string
      }[]
      total: number
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization.members.$get(
        {
          query: {
            organizationId: detachedOrganizationId,
          },
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(listedMembers.data.total).toBe(1)
    expect(listedMembers.data.members[0]?.userId).toBe(detachedMemberId)

    const directAddHeaders = await createSessionHeaders({
      email: 'direct-add@example.com',
    })
    const directAddSession =
      await createTestAuthClient(directAddHeaders).client.getSession()
    expect(directAddSession.error).toBeNull()

    const directAddUserId = requireValue(
      directAddSession.data?.user.id,
      'direct add user id',
    )

    const updatedOrganization = await expectJsonResponse<{
      id: string
      memberCount: number
      name: string
      slug: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization.$patch({
        json: {
          organizationId: detachedOrganizationId,
          name: 'Super Admin Renamed Organization',
        },
      }),
      {
        status: 200,
        message: 'Organization updated',
      },
    )

    expect(updatedOrganization.data.id).toBe(detachedOrganizationId)
    expect(updatedOrganization.data.name).toBe(
      'Super Admin Renamed Organization',
    )

    const addedMember = await expectJsonResponse<{
      id: string
      organizationId: string
      role: string
      userId: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization[
        'add-member'
      ].$post({
        json: {
          organizationId: detachedOrganizationId,
          role: 'org_viewer',
          userId: directAddUserId,
        },
      }),
      {
        status: 201,
        message: 'Member added',
      },
    )

    expect(addedMember.data.organizationId).toBe(detachedOrganizationId)
    expect(addedMember.data.role).toBe('org_viewer')
    expect(addedMember.data.userId).toBe(directAddUserId)

    const persistedAddedMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, directAddUserId),
        ),
    })
    expect(persistedAddedMember?.role).toBe('org_viewer')

    const persistedUpdatedOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, detachedOrganizationId),
    })
    expect(persistedUpdatedOrganization?.name).toBe(
      'Super Admin Renamed Organization',
    )

    const updatedMember = await expectJsonResponse<{
      id: string
      role: string
      userId: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization[
        'member-role'
      ].$post({
        json: {
          memberId: requireValue(
            listedMembers.data.members[0]?.id,
            'detached member id',
          ),
          organizationId: detachedOrganizationId,
          role: 'org_creator',
        },
      }),
      {
        status: 200,
        message: 'Member role updated',
      },
    )

    expect(updatedMember.data.role).toBe('org_creator')

    const persistedDetachedMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, detachedMemberId),
        ),
    })
    expect(persistedDetachedMember?.role).toBe('org_creator')

    const createdInvitation = await expectJsonResponse<{
      id: string
      email: string
      organizationId: string
      role: string
      status: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization.invite.$post(
        {
          json: {
            email: 'detached-invitee@example.com',
            organizationId: detachedOrganizationId,
            role: 'org_viewer',
          },
        },
      ),
      {
        status: 201,
        message: 'Invitation created',
      },
    )

    expect(createdInvitation.data.organizationId).toBe(detachedOrganizationId)
    expect(createdInvitation.data.status).toBe('pending')

    const listedInvitations = await expectJsonResponse<
      {
        id: string
        email: string
        organizationId: string
      }[]
    >(
      await createAppClient(
        superAdminHeaders,
      ).api.v0.organization.invitations.$get({
        query: {
          organizationId: detachedOrganizationId,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      listedInvitations.data.some(
        (currentInvitation) =>
          currentInvitation.id === createdInvitation.data.id &&
          currentInvitation.organizationId === detachedOrganizationId,
      ),
    ).toBe(true)

    const canceledInvitation = await expectJsonResponse<{
      id: string
      organizationId: string
      status: string
    }>(
      await createAppClient(superAdminHeaders).api.v0.organization[
        'cancel-invitation'
      ].$post({
        json: {
          invitationId: createdInvitation.data.id,
          organizationId: detachedOrganizationId,
        },
      }),
      {
        status: 200,
        message: 'Invitation canceled',
      },
    )

    expect(canceledInvitation.data.id).toBe(createdInvitation.data.id)
    expect(canceledInvitation.data.organizationId).toBe(detachedOrganizationId)
    expect(canceledInvitation.data.status).toBe('canceled')

    const persistedCanceledInvitation = await db.query.invitation.findFirst({
      where: eq(invitation.id, createdInvitation.data.id),
    })
    expect(persistedCanceledInvitation?.status).toBe('canceled')

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.organization[
        'remove-member'
      ].$post({
        json: {
          memberIdOrEmail: requireValue(
            listedMembers.data.members[0]?.id,
            'detached member id',
          ),
          organizationId: detachedOrganizationId,
        },
      }),
      {
        status: 200,
        message: 'Member removed',
      },
    )

    const removedDetachedMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, detachedOrganizationId),
          eq(table.userId, detachedMemberId),
        ),
    })
    expect(removedDetachedMember).toBeUndefined()
  })

  it('enforces the role matrix, visibility transitions, and public dependency validation', async () => {
    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.dataset.$post({
        json: {
          name: 'Creator dataset',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    await expectJsonResponse(
      await createAppClient(viewerHeaders).api.v0.report.$post({
        json: {
          name: 'Viewer report',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const reportJson = await expectJsonResponse<{ id: string }>(
      await createAppClient(creatorHeaders).api.v0.report.$post({
        json: {
          name: 'Creator report',
        },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'].$patch({
        param: {
          id: reportJson.data.id,
        },
        json: {
          content: {
            type: 'doc',
            content: [
              {
                type: 'chart',
                attrs: {
                  chart: {
                    type: 'plot',
                    subType: 'line',
                    productRunId: seededIds.productRun,
                    indicatorIds: [seededIds.indicator],
                    geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
                    timePoints: ['2021-01-01T00:00:00.000Z'],
                  },
                },
              },
            ],
          },
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const blockedPublishJson = await expectJsonResponse<{
      dependencies: { resourceType: string; id: string }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.report[':id'][
        'visibility'
      ].$patch({
        param: {
          id: reportJson.data.id,
        },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 400,
        message: 'Cannot make report public',
        description:
          'This resource depends on private upstream data. Make every dependency public first.',
      },
    )

    expect(
      blockedPublishJson.data.dependencies.some(
        (dependency) => dependency.id === seededIds.product,
      ),
    ).toBe(true)

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'][
        'visibility'
      ].$patch({
        param: {
          id: reportJson.data.id,
        },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description:
          'Only org admins or super admins can change resource visibility.',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'][
        'preview-pdf'
      ].$post({
        param: {
          id: reportJson.data.id,
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description:
          'Only org admins or super admins can generate report PDFs.',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'].publish.$post({
        param: {
          id: reportJson.data.id,
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description:
          'Only org admins or super admins can generate report PDFs.',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'private',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dashboard[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dashboard },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dashboard visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.indicator.derived[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.derivedIndicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 400,
        message: 'Cannot make derivedIndicator public',
        description:
          'This resource depends on private upstream data. Make every dependency public first.',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.product[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.product },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 400,
        message: 'Cannot make product public',
        description:
          'This resource depends on private upstream data. Make every dependency public first.',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.measured[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: 'Only super admins can change global visibility.',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'private',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: 'Only super admins can change global visibility.',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.geometries[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.geometries },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Geometries visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.product[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.product },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Product visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.derived[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.derivedIndicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Derived indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dashboard[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dashboard },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dashboard visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.report[':id'][
        'visibility'
      ].$patch({
        param: {
          id: reportJson.data.id,
        },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Report visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'][
        'visibility'
      ].$patch({
        param: {
          id: seededIds.report,
        },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description:
          'Org creators can only manage dashboards and reports they created.',
      },
    )
  })

  it('warns before making upstream dependencies private and redacts cross-org dependents', async () => {
    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.geometries[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.geometries },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Geometries visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.measured[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.product[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.product },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Product visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.report[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.report },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Report visibility updated',
      },
    )

    await db.insert(reportIndicatorUsage).values({
      reportId: seededIds.report,
      productRunId: seededIds.productRun,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    })

    await db.insert(organization).values({
      id: 'other-organization',
      slug: 'other-organization',
      name: 'Other Organization',
      createdAt: new Date('2025-03-01T00:00:00.000Z'),
      metadata: '{}',
    })

    await db.insert(report).values({
      id: 'other-report',
      name: 'Other Org Report',
      description: null,
      content: null,
      metadata: null,
      createdAt: new Date('2025-03-01T00:00:00.000Z'),
      updatedAt: new Date('2025-03-01T00:00:00.000Z'),
      organizationId: 'other-organization',
      createdByUserId: seededIds.adminUser,
      visibility: 'public',
    })

    await db.insert(reportIndicatorUsage).values({
      reportId: 'other-report',
      productRunId: seededIds.productRun,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    })

    const previewJson = await expectJsonResponse<{
      canApply: boolean
      warnings: {
        resources: { id: string; resourceType: string }[]
        externalCounts: { count: number; resourceType: string }[]
      }[]
    }>(
      await app.request(
        `/api/v0/dataset/${seededIds.dataset}/visibility-impact?targetVisibility=private`,
        {
          headers: superAdminHeaders,
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(previewJson.data.canApply).toBe(true)
    expect(
      previewJson.data.warnings.some((warning) =>
        warning.resources.some(
          (resource) =>
            resource.id === seededIds.product &&
            resource.resourceType === 'product',
        ),
      ),
    ).toBe(true)
    expect(
      previewJson.data.warnings.some((warning) =>
        warning.resources.some(
          (resource) =>
            resource.id === seededIds.report &&
            resource.resourceType === 'report',
        ),
      ),
    ).toBe(true)
    expect(
      previewJson.data.warnings.some((warning) =>
        warning.resources.some((resource) => resource.id === 'other-report'),
      ),
    ).toBe(false)
    expect(
      previewJson.data.warnings.some((warning) =>
        warning.externalCounts.some(
          (externalCount) =>
            externalCount.resourceType === 'report' &&
            externalCount.count === 1,
        ),
      ),
    ).toBe(true)

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'private',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )
  })

  it('warns when a measured indicator has cross-organization derived indicator dependents', async () => {
    const otherOrgAdminHeaders = await createSessionHeaders({
      email: 'other-org-indicator-admin@example.com',
      organizationId: 'other-indicator-warning-organization',
      organizationRole: 'org_admin',
      twoFactorEnabled: true,
    })

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.measured[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(
        otherOrgAdminHeaders,
      ).api.v0.indicator.derived.$post({
        json: {
          name: 'Cross-org derived dependency',
          unit: '%',
          expression: '$1 * 4',
          indicatorIds: [seededIds.indicator],
        },
      }),
      {
        status: 201,
        message: 'Derived indicator created',
      },
    )

    const previewJson = await expectJsonResponse<{
      canApply: boolean
      warnings: {
        resources: { id: string; resourceType: string }[]
        externalCounts: { count: number; resourceType: string }[]
      }[]
    }>(
      await app.request(
        `/api/v0/indicator/measured/${seededIds.indicator}/visibility-impact?targetVisibility=private`,
        {
          headers: superAdminHeaders,
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(previewJson.data.canApply).toBe(true)
    expect(
      previewJson.data.warnings.some((warning) =>
        warning.externalCounts.some(
          (externalCount) =>
            externalCount.resourceType === 'derivedIndicator' &&
            externalCount.count === 1,
        ),
      ),
    ).toBe(true)
  })

  it('requires a main run output summary before a product can become public or global', async () => {
    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.geometries[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.geometries },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Geometries visibility updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.measured[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    await db
      .delete(productOutputSummary)
      .where(eq(productOutputSummary.productRunId, seededIds.productRun))

    const previewJson = await expectJsonResponse<{
      canApply: boolean
      blockingIssues: { code: string }[]
    }>(
      await app.request(
        `/api/v0/product/${seededIds.product}/visibility-impact?targetVisibility=public`,
        {
          headers: superAdminHeaders,
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(previewJson.data.canApply).toBe(false)
    expect(
      previewJson.data.blockingIssues.some(
        (issue) => issue.code === 'missing_main_run_output_summary',
      ),
    ).toBe(true)

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.product[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.product },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 400,
        message: 'Cannot make product public',
        description:
          'This product needs a main run with an output summary before it can be public.',
      },
    )

    const seededProduct = await db.query.product.findFirst({
      where: eq(product.id, seededIds.product),
      columns: {
        mainRunId: true,
      },
    })

    expect(seededProduct?.mainRunId).toBe(seededIds.productRun)
  })

  it('writes one route-level audit decision for v0 resource authorization', async () => {
    const noMfaHeaders = await createSessionHeaders({
      email: 'route-audit-no-mfa@example.com',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })
    const otherOrgHeaders = await createSessionHeaders({
      email: 'route-audit-other-org@example.com',
      organizationId: 'route-audit-other-organization',
      organizationRole: 'org_admin',
      twoFactorEnabled: true,
    })

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'].$get({
        param: {
          id: seededIds.dataset,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/dataset/${seededIds.dataset}`,
      requestMethod: 'GET',
      decision: 'allow',
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      targetOrganizationId: seededIds.organization,
      details: {
        permission: 'read:dataset',
        statusCode: 200,
      },
    })

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'].$patch({
        param: {
          id: seededIds.dataset,
        },
        json: {
          description: 'Allowed route audit update',
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/dataset/${seededIds.dataset}`,
      requestMethod: 'PATCH',
      decision: 'allow',
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      targetOrganizationId: seededIds.organization,
      details: {
        permission: 'write:dataset',
        statusCode: 200,
      },
    })

    await expectJsonResponse(
      await createAppClient(otherOrgHeaders).api.v0.dataset[':id'].$get({
        param: {
          id: seededIds.dataset,
        },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
        description: "dataset you're looking for is not found",
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/dataset/${seededIds.dataset}`,
      requestMethod: 'GET',
      decision: 'deny',
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      targetOrganizationId: 'route-audit-other-organization',
      details: {
        permission: 'read:dataset',
        statusCode: 404,
      },
    })

    await expectJsonResponse(
      await createAppClient(otherOrgHeaders).api.v0.dataset[':id'].$patch({
        param: {
          id: seededIds.dataset,
        },
        json: {
          description: 'Blocked cross-org route audit update',
        },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
        description: "dataset you're looking for is not found",
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/dataset/${seededIds.dataset}`,
      requestMethod: 'PATCH',
      decision: 'deny',
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      targetOrganizationId: 'route-audit-other-organization',
      details: {
        permission: 'write:dataset',
        statusCode: 404,
      },
    })

    await expectJsonResponse(
      await createAppClient(noMfaHeaders).api.v0.dataset.$post({
        json: {
          name: 'Blocked route audit create without MFA',
        },
      }),
      {
        status: 403,
        message: 'Two-factor authentication is required',
        description:
          'Enable two-factor authentication before performing this action.',
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: '/api/v0/dataset',
      requestMethod: 'POST',
      decision: 'deny',
      resourceType: 'dataset',
      resourceId: null,
      targetOrganizationId: seededIds.organization,
      details: {
        permission: 'write:dataset',
        statusCode: 403,
      },
    })

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0['product-run'][
        ':id'
      ].outputs.$get({
        param: {
          id: seededIds.productRun,
        },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/product-run/${seededIds.productRun}/outputs`,
      requestMethod: 'GET',
      decision: 'allow',
      resourceType: 'productRun',
      resourceId: seededIds.productRun,
      targetOrganizationId: seededIds.organization,
      details: {
        permission: 'read:productRun',
        statusCode: 200,
      },
    })

    await expectJsonResponse(
      await createAppClient(otherOrgHeaders).api.v0['product-run'][
        ':id'
      ].outputs.$get({
        param: {
          id: seededIds.productRun,
        },
        query: {},
      }),
      {
        status: 404,
        message: 'Failed to get productRun',
        description: "productRun you're looking for is not found",
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/product-run/${seededIds.productRun}/outputs`,
      requestMethod: 'GET',
      decision: 'deny',
      resourceType: 'productRun',
      resourceId: seededIds.productRun,
      targetOrganizationId: 'route-audit-other-organization',
      details: {
        permission: 'read:productRun',
        statusCode: 404,
      },
    })

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0['geometries-run'][
        ':id'
      ].outputs.export.$get({
        param: {
          id: seededIds.geometriesRun,
        },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    await expectSingleRouteAuditLog({
      requestPath: `/api/v0/geometries-run/${seededIds.geometriesRun}/outputs/export`,
      requestMethod: 'GET',
      decision: 'allow',
      resourceType: 'geometriesRun',
      resourceId: seededIds.geometriesRun,
      targetOrganizationId: seededIds.organization,
      details: {
        permission: 'read:geometriesRun',
        statusCode: 200,
      },
    })
  })

  it('requires MFA for org admins, enforces the last-admin floor, and exposes org-scoped logs only to admins', async () => {
    const noMfaHeaders = await createSessionHeaders({
      email: 'org-admin-no-mfa@example.com',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })
    const noMfaSuperAdminHeaders = await createSessionHeaders({
      email: 'super-admin-no-mfa@example.com',
      role: 'super_admin',
      organizationRole: 'org_admin',
      twoFactorEnabled: false,
    })

    await expectJsonResponse(
      await createAppClient(noMfaHeaders).api.v0.dataset.$post({
        json: {
          name: 'Blocked without MFA',
        },
      }),
      {
        status: 403,
        message: 'Two-factor authentication is required',
        description:
          'Enable two-factor authentication before performing this action.',
      },
    )

    await expectJsonResponse(
      await createAppClient(noMfaSuperAdminHeaders).api.v0.organization.$get(),
      {
        status: 403,
        message: 'Two-factor authentication is required',
        description:
          'Enable two-factor authentication before performing this action.',
      },
    )

    const deniedInvitationResponse = await app.request(
      '/api/auth/organization/invite-member',
      {
        method: 'POST',
        headers: createAuthPostHeaders(noMfaHeaders),
        body: JSON.stringify({
          email: 'blocked-no-mfa-invitee@example.com',
          role: 'org_admin',
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(deniedInvitationResponse.status).toBe(403)

    const invitationResponse = await app.request(
      '/api/auth/organization/invite-member',
      {
        method: 'POST',
        headers: createAuthPostHeaders(orgAdminHeaders),
        body: JSON.stringify({
          email: 'invitee@example.com',
          role: 'org_admin',
          organizationId: seededIds.organization,
        }),
      },
    )
    expect(invitationResponse.status).toBe(200)

    const pendingInvitation = await db.query.invitation.findFirst({
      where: eq(invitation.email, 'invitee@example.com'),
    })
    expect(pendingInvitation?.organizationId).toBe(seededIds.organization)

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.organization.invite.$post(
        {
          json: {
            email: 'super-admin-route-invitee@example.com',
            organizationId: seededIds.organization,
            role: 'org_viewer',
          },
        },
      ),
      {
        status: 201,
        message: 'Invitation created',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.organization.members.$get(
        {
          query: {
            organizationId: seededIds.organization,
          },
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    const inviteeAuth = createTestAuthClient()
    const inviteeSignUpResult = await inviteeAuth.client.signUp.email({
      email: 'invitee@example.com',
      password: 'password123',
      name: 'Invitee User',
    })
    expect(inviteeSignUpResult.error).toBeNull()

    const acceptInvitationResponse = await app.request(
      '/api/auth/organization/accept-invitation',
      {
        method: 'POST',
        headers: createAuthPostHeaders(inviteeAuth.headers),
        body: JSON.stringify({
          invitationId: requireValue(pendingInvitation?.id, 'invitation id'),
        }),
      },
    )
    expect(acceptInvitationResponse.status).toBe(200)

    const inviteeUser = await db.query.user.findFirst({
      where: eq(user.email, 'invitee@example.com'),
    })
    expect(inviteeUser).toBeDefined()

    const inviteeMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, requireValue(inviteeUser?.id, 'invitee user id')),
          eq(table.organizationId, seededIds.organization),
        ),
    })
    expect(inviteeMember?.role).toBe('org_admin')

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'].runs.$get({
        param: {
          id: seededIds.dataset,
        },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.geometries[':id'][
        'runs'
      ].$get({
        param: {
          id: seededIds.geometries,
        },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const otherOrgHeaders = await createSessionHeaders({
      email: 'other-org-admin@example.com',
      organizationId: 'other-org-access-control',
      organizationRole: 'org_admin',
      twoFactorEnabled: true,
    })

    await expectJsonResponse(
      await createAppClient(otherOrgHeaders).api.v0.dataset[':id'].$patch({
        param: {
          id: seededIds.dataset,
        },
        json: {
          description: 'Blocked cross-org update',
        },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
        description: "dataset you're looking for is not found",
      },
    )

    const deniedWrongOrgWrite = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.requestPath, `/api/v0/dataset/${seededIds.dataset}`),
          eq(table.requestMethod, 'PATCH'),
          eq(table.decision, 'deny'),
          eq(table.targetOrganizationId, 'other-org-access-control'),
        ),
    })
    expect(deniedWrongOrgWrite?.details).toMatchObject({
      permission: 'write:dataset',
      statusCode: 404,
    })

    const soloAdminHeaders = await createSessionHeaders({
      email: 'solo-admin@example.com',
      organizationId: 'solo-organization',
      organizationRole: 'org_admin',
      twoFactorEnabled: true,
    })
    const soloAdminAuth = createTestAuthClient(soloAdminHeaders)
    const soloAdminSession = await soloAdminAuth.client.getSession()
    expect(soloAdminSession.error).toBeNull()

    const soloAdminUserId = requireValue(
      soloAdminSession.data?.user.id,
      'solo admin user id',
    )
    const soloAdminMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, soloAdminUserId),
          eq(table.organizationId, 'solo-organization'),
        ),
    })
    expect(soloAdminMember).toBeDefined()

    const demoteLastAdminResult =
      await soloAdminAuth.client.organization.updateMemberRole({
        memberId: requireValue(soloAdminMember?.id, 'solo admin member id'),
        role: 'org_viewer',
      })

    expect(demoteLastAdminResult.error?.status).toBe(400)
    const persistedSoloAdminMember = await db.query.member.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, soloAdminUserId),
          eq(table.organizationId, 'solo-organization'),
        ),
    })
    expect(persistedSoloAdminMember?.role).toBe('org_admin')

    await expectJsonResponse(
      await createAppClient(viewerHeaders).api.v0.logs.audit.$get({
        query: {},
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    await db.insert(auditLog).values({
      id: 'org-get-session-audit-log',
      createdAt: new Date('2025-01-05T00:00:00.000Z'),
      actorUserId: seededIds.adminUser,
      actorRole: 'org_admin',
      activeOrganizationId: seededIds.organization,
      targetOrganizationId: seededIds.organization,
      resourceType: 'auth',
      resourceId: seededIds.adminUser,
      action: 'get_session',
      decision: 'allow',
      requestPath: '/api/auth/get-session',
      requestMethod: 'GET',
      ipAddress: null,
      userAgent: null,
      details: {
        statusCode: 200,
      },
    })

    const getSessionAuditLogsJson = await expectJsonResponse<{
      pageCount: number
      totalCount: number
      data: {
        id: string
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          action: 'get_session',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(getSessionAuditLogsJson.data).toMatchObject({
      pageCount: 0,
      totalCount: 0,
    })
    expect(getSessionAuditLogsJson.data.data).toEqual([])

    const auditLogsJson = await expectJsonResponse<{
      data: {
        resourceType: string
        action: string
        decision: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      auditLogsJson.data.data.some(
        (entry) =>
          entry.resourceType === 'auth' &&
          entry.action === 'invite_member' &&
          entry.decision === 'allow',
      ),
    ).toBe(true)
    expect(
      auditLogsJson.data.data.some(
        (entry) =>
          entry.resourceType === 'invitation' &&
          entry.action === 'invite' &&
          entry.decision === 'allow' &&
          entry.targetOrganizationId === seededIds.organization,
      ),
    ).toBe(true)
    expect(
      auditLogsJson.data.data.some(
        (entry) =>
          entry.resourceType === 'auth' &&
          entry.action === 'accept_invitation' &&
          entry.targetOrganizationId === seededIds.organization,
      ),
    ).toBe(true)

    expect(
      auditLogsJson.data.data.some(
        (entry) => entry.resourceType === 'auditLog' && entry.action === 'read',
      ),
    ).toBe(false)
    expect(
      auditLogsJson.data.data.some(
        (entry) =>
          entry.resourceType === 'member' &&
          entry.action === 'list' &&
          entry.decision === 'allow',
      ),
    ).toBe(true)

    const mutatingAuditLogsJson = await expectJsonResponse<{
      data: {
        requestMethod: string
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          requestKind: 'mutating',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(mutatingAuditLogsJson.data.data.length).toBeGreaterThan(0)
    expect(
      mutatingAuditLogsJson.data.data.every((entry) =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(entry.requestMethod),
      ),
    ).toBe(true)

    const datasetRunAuditLog = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.requestPath, `/api/v0/dataset/${seededIds.dataset}/runs`),
          eq(table.resourceType, 'datasetRun'),
          eq(table.decision, 'allow'),
        ),
    })
    expect(datasetRunAuditLog).toBeDefined()

    const geometriesRunAuditLog = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(
            table.requestPath,
            `/api/v0/geometries/${seededIds.geometries}/runs`,
          ),
          eq(table.resourceType, 'geometriesRun'),
          eq(table.decision, 'allow'),
        ),
    })
    expect(geometriesRunAuditLog).toBeDefined()
  })

  it('includes actor user summaries in organization audit logs', async () => {
    await db.insert(auditLog).values({
      id: 'org-actor-summary-log',
      createdAt: new Date('2025-01-04T00:00:00.000Z'),
      actorUserId: seededIds.adminUser,
      actorRole: 'org_admin',
      activeOrganizationId: seededIds.organization,
      targetOrganizationId: seededIds.organization,
      resourceType: 'dataset',
      resourceId: seededIds.dataset,
      action: 'read',
      decision: 'allow',
      requestPath: `/api/v0/dataset/${seededIds.dataset}`,
      requestMethod: 'GET',
      ipAddress: null,
      userAgent: null,
      details: {
        statusCode: 200,
      },
    })

    const auditLogsJson = await expectJsonResponse<{
      data: {
        id: string
        actorUserId: string | null
        actorUser: {
          id: string
          name: string
          email: string
        } | null
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          action: 'read',
          resourceType: 'dataset',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const actorSummaryLog = auditLogsJson.data.data.find(
      (entry) => entry.id === 'org-actor-summary-log',
    )
    expect(actorSummaryLog).toMatchObject({
      actorUserId: seededIds.adminUser,
      actorUser: {
        id: seededIds.adminUser,
        name: 'Seed Admin',
        email: 'seed-admin@example.com',
      },
    })

    const actorSearchLogsJson = await expectJsonResponse<{
      data: {
        id: string
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          search: 'seed-admin@example.com',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      actorSearchLogsJson.data.data.some(
        (entry) => entry.id === 'org-actor-summary-log',
      ),
    ).toBe(true)

    const resourceSearchLogsJson = await expectJsonResponse<{
      data: {
        id: string
      }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit.$get({
        query: {
          search: 'dataset',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      resourceSearchLogsJson.data.data.some(
        (entry) => entry.id === 'org-actor-summary-log',
      ),
    ).toBe(true)
  })

  it('exposes target-organization-less audit logs only to super admins', async () => {
    await db.insert(auditLog).values([
      {
        id: 'unscoped-sign-in-log',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        actorUserId: null,
        actorRole: null,
        activeOrganizationId: null,
        targetOrganizationId: null,
        resourceType: 'auth',
        resourceId: null,
        action: 'sign_in',
        decision: 'allow',
        requestPath: '/api/auth/sign-in/email',
        requestMethod: 'POST',
        ipAddress: null,
        userAgent: null,
        details: {
          statusCode: 200,
        },
      },
      {
        id: 'unscoped-api-key-log',
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        actorUserId: seededIds.adminUser,
        actorRole: 'super_admin',
        activeOrganizationId: seededIds.organization,
        targetOrganizationId: null,
        resourceType: 'auth',
        resourceId: null,
        action: 'api_key_create',
        decision: 'allow',
        requestPath: '/api/auth/api-key/create',
        requestMethod: 'POST',
        ipAddress: null,
        userAgent: null,
        details: {
          statusCode: 200,
        },
      },
      {
        id: 'org-scoped-auth-log',
        createdAt: new Date('2025-01-03T00:00:00.000Z'),
        actorUserId: seededIds.adminUser,
        actorRole: 'super_admin',
        activeOrganizationId: seededIds.organization,
        targetOrganizationId: seededIds.organization,
        resourceType: 'auth',
        resourceId: null,
        action: 'sign_in',
        decision: 'allow',
        requestPath: '/api/auth/sign-in/email',
        requestMethod: 'POST',
        ipAddress: null,
        userAgent: null,
        details: {
          statusCode: 200,
        },
      },
    ])

    await db.insert(auditLog).values({
      id: 'unscoped-get-session-log',
      createdAt: new Date('2025-01-04T00:00:00.000Z'),
      actorUserId: seededIds.adminUser,
      actorRole: 'super_admin',
      activeOrganizationId: seededIds.organization,
      targetOrganizationId: null,
      resourceType: 'auth',
      resourceId: seededIds.adminUser,
      action: 'get_session',
      decision: 'allow',
      requestPath: '/api/auth/get-session',
      requestMethod: 'GET',
      ipAddress: null,
      userAgent: null,
      details: {
        statusCode: 200,
      },
    })

    await expectJsonResponse(
      await createAppClient().api.v0.logs.audit['super-admin'].$get({
        query: {},
      }),
      {
        status: 401,
        message: 'User is not authenticated',
      },
    )

    await expectJsonResponse(
      await createAppClient(orgAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {},
      }),
      {
        status: 403,
        message: 'User is not authorized',
      },
    )

    const superAdminGetSessionLogsJson = await expectJsonResponse<{
      pageCount: number
      totalCount: number
      data: {
        id: string
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          action: 'get_session',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(superAdminGetSessionLogsJson.data).toMatchObject({
      pageCount: 0,
      totalCount: 0,
    })
    expect(superAdminGetSessionLogsJson.data.data).toEqual([])

    const filteredLogsJson = await expectJsonResponse<{
      pageCount: number
      totalCount: number
      data: {
        id: string
        action: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          action: 'sign_in',
          decision: 'allow',
          resourceType: 'auth',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(filteredLogsJson.data).toMatchObject({
      pageCount: 1,
      totalCount: 1,
    })
    expect(filteredLogsJson.data.data).toEqual([
      expect.objectContaining({
        id: 'unscoped-sign-in-log',
        action: 'sign_in',
        targetOrganizationId: null,
      }),
    ])

    const superAdminActionSearchLogsJson = await expectJsonResponse<{
      data: {
        id: string
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          search: 'api key create',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      superAdminActionSearchLogsJson.data.data.some(
        (entry) => entry.id === 'unscoped-api-key-log',
      ),
    ).toBe(true)

    const superAdminActorSearchLogsJson = await expectJsonResponse<{
      data: {
        id: string
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          search: 'seed-admin@example.com',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      superAdminActorSearchLogsJson.data.data.some(
        (entry) => entry.id === 'unscoped-api-key-log',
      ),
    ).toBe(true)

    const auditLogReadEntry = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.requestPath, '/api/v0/logs/audit/super-admin'),
          eq(table.resourceType, 'auditLog'),
          eq(table.action, 'read'),
          eq(table.decision, 'allow'),
          isNull(table.targetOrganizationId),
        ),
    })
    expect(auditLogReadEntry?.details).toMatchObject({
      scope: 'super_admin',
      statusCode: 200,
    })

    const superAdminReadLogsJson = await expectJsonResponse<{
      data: {
        requestMethod: string
        resourceType: string
      }[]
    }>(
      await createAppClient(superAdminHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          requestKind: 'read',
          resourceType: 'auditLog',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(superAdminReadLogsJson.data.data.length).toBeGreaterThan(0)
    expect(
      superAdminReadLogsJson.data.data.every(
        (entry) =>
          entry.resourceType === 'auditLog' && entry.requestMethod === 'GET',
      ),
    ).toBe(true)

    const superAdminAuth = createTestAuthClient(superAdminHeaders)
    const superAdminSession = await superAdminAuth.client.getSession()
    expect(superAdminSession.error).toBeNull()
    const superAdminUserId = requireValue(
      superAdminSession.data?.user.id,
      'super admin user id',
    )
    await db
      .update(session)
      .set({
        activeOrganizationId: null,
      })
      .where(eq(session.userId, superAdminUserId))

    const superAdminNoOrganizationHeaders = new Headers(superAdminHeaders)
    superAdminNoOrganizationHeaders.delete('x-sdf-active-organization-id')

    const firstPageJson = await expectJsonResponse<{
      pageCount: number
      totalCount: number
      data: {
        id: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(superAdminNoOrganizationHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          decision: 'allow',
          page: 1,
          resourceType: 'auth',
          size: 1,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(firstPageJson.data).toMatchObject({
      pageCount: 2,
      totalCount: 2,
    })
    expect(firstPageJson.data.data).toEqual([
      expect.objectContaining({
        id: 'unscoped-api-key-log',
        targetOrganizationId: null,
      }),
    ])

    const secondPageJson = await expectJsonResponse<{
      data: {
        id: string
        targetOrganizationId: string | null
      }[]
    }>(
      await createAppClient(superAdminNoOrganizationHeaders).api.v0.logs.audit[
        'super-admin'
      ].$get({
        query: {
          decision: 'allow',
          page: 2,
          resourceType: 'auth',
          size: 1,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(secondPageJson.data.data).toEqual([
      expect.objectContaining({
        id: 'unscoped-sign-in-log',
        targetOrganizationId: null,
      }),
    ])
  })

  it('supports active-organization switching and keeps API keys scoped to the owner membership context', async () => {
    const multiOrgHeaders = await createSessionHeaders({
      email: 'multi-org@example.com',
      organizationRole: 'org_viewer',
    })

    const secondOrganizationId = 'second-organization'
    await db.insert(organization).values({
      id: secondOrganizationId,
      slug: secondOrganizationId,
      name: 'Second Organization',
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
      metadata: '{}',
    })

    const authClient = createTestAuthClient(multiOrgHeaders)
    const multiOrgSession = await authClient.client.getSession()
    expect(multiOrgSession.error).toBeNull()

    const multiOrgUserId = requireValue(
      multiOrgSession.data?.user.id,
      'multi-org user id',
    )
    const targetApiKeyHeaders = await createSessionHeaders({
      email: 'api-key-spoof-target@example.com',
      organizationRole: 'org_viewer',
    })
    const targetApiKeyUserId = await loadSessionUserId(
      targetApiKeyHeaders,
      'api key spoof target user id',
    )

    await db.insert(member).values({
      id: 'multi-org-second-member',
      organizationId: secondOrganizationId,
      userId: multiOrgUserId,
      role: 'org_viewer',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
    })

    await db.insert(dataset).values({
      id: 'second-org-dataset',
      name: 'Second Org Dataset',
      description: 'Visible only in the second org',
      metadata: null,
      organizationId: secondOrganizationId,
      createdByUserId: multiOrgUserId,
      visibility: 'private',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
      sourceUrl: null,
      sourceMetadataUrl: null,
      mainRunId: null,
    })

    const defaultOrgList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(authClient.headers).api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      defaultOrgList.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(true)
    expect(
      defaultOrgList.data.data.some(
        (entry) => entry.id === 'second-org-dataset',
      ),
    ).toBe(false)

    const switchResponse = await app.request(
      '/api/auth/organization/set-active',
      {
        method: 'POST',
        headers: createAuthPostHeaders(multiOrgHeaders),
        body: JSON.stringify({
          organizationId: secondOrganizationId,
        }),
      },
    )
    expect(switchResponse.status).toBe(200)

    const switchedHeaders = new Headers(multiOrgHeaders)
    switchedHeaders.delete('x-sdf-active-organization-id')

    const secondOrgList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      secondOrgList.data.data.some(
        (entry) => entry.id === 'second-org-dataset',
      ),
    ).toBe(true)
    expect(
      secondOrgList.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(false)

    const apiKeyResult = await authClient.client.apiKey.create({
      name: 'multi-org-access',
    })
    expect(apiKeyResult.error).toBeNull()
    const apiKeyValue = requireValue(apiKeyResult.data?.key, 'api key')
    const apiKeyId = requireValue(apiKeyResult.data?.id, 'api key id')

    const persistedApiKey = await db.query.apikey.findFirst({
      where: eq(apikey.id, apiKeyId),
    })
    expect(persistedApiKey?.referenceId).toBe(multiOrgUserId)

    const spoofedApiKeyResponse = await app.request(
      '/api/auth/api-key/create',
      {
        method: 'POST',
        headers: createAuthPostHeaders(multiOrgHeaders),
        body: JSON.stringify({
          name: 'spoofed-api-key',
          userId: targetApiKeyUserId,
        }),
      },
    )
    expect([401, 403]).toContain(spoofedApiKeyResponse.status)
    const targetUserApiKeys = await db.query.apikey.findMany({
      where: eq(apikey.referenceId, targetApiKeyUserId),
    })
    expect(targetUserApiKeys).toHaveLength(0)

    const apiKeySecondOrgList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient({
        'x-api-key': apiKeyValue,
        'x-sdf-active-organization-id': secondOrganizationId,
      }).api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      apiKeySecondOrgList.data.data.some(
        (entry) => entry.id === 'second-org-dataset',
      ),
    ).toBe(true)
    expect(
      apiKeySecondOrgList.data.data.some(
        (entry) => entry.id === seededIds.dataset,
      ),
    ).toBe(false)

    const apiKeyAdminResponse = await app.request(
      '/api/auth/admin/list-users',
      {
        headers: createAuthGetHeaders({
          'x-api-key': apiKeyValue,
        }),
      },
    )
    expect([401, 403]).toContain(apiKeyAdminResponse.status)

    const apiKeyInvitationResponse = await app.request(
      `/api/auth/organization/list-invitations?organizationId=${secondOrganizationId}`,
      {
        headers: createAuthGetHeaders({
          'x-api-key': apiKeyValue,
          'x-sdf-active-organization-id': secondOrganizationId,
        }),
      },
    )
    expect(apiKeyInvitationResponse.status).toBe(403)
  })

  it('lists only global resources across organizations while still allowing direct reads of public resources', async () => {
    const multiOrgHeaders = await createSessionHeaders({
      email: 'cross-org-public@example.com',
      organizationRole: 'org_viewer',
    })

    const secondOrganizationId = 'public-second-organization'
    await db.insert(organization).values({
      id: secondOrganizationId,
      slug: secondOrganizationId,
      name: 'Public Second Organization',
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
      metadata: '{}',
    })

    const authClient = createTestAuthClient(multiOrgHeaders)
    const multiOrgSession = await authClient.client.getSession()
    expect(multiOrgSession.error).toBeNull()

    const multiOrgUserId = requireValue(
      multiOrgSession.data?.user.id,
      'cross-org public user id',
    )

    await db.insert(member).values({
      id: 'cross-org-public-member',
      organizationId: secondOrganizationId,
      userId: multiOrgUserId,
      role: 'org_viewer',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
    })

    await db.insert(dataset).values({
      id: 'public-second-org-dataset',
      name: 'Public Second Org Dataset',
      description: 'Visible only inside the second org',
      metadata: null,
      organizationId: secondOrganizationId,
      createdByUserId: multiOrgUserId,
      visibility: 'private',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
      sourceUrl: null,
      sourceMetadataUrl: null,
      mainRunId: null,
    })

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    const switchResponse = await app.request(
      '/api/auth/organization/set-active',
      {
        method: 'POST',
        headers: createAuthPostHeaders(multiOrgHeaders),
        body: JSON.stringify({
          organizationId: secondOrganizationId,
        }),
      },
    )
    expect(switchResponse.status).toBe(200)

    const switchedHeaders = new Headers(multiOrgHeaders)
    switchedHeaders.delete('x-sdf-active-organization-id')

    const secondOrgList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      secondOrgList.data.data.some(
        (entry) => entry.id === 'public-second-org-dataset',
      ),
    ).toBe(true)
    expect(
      secondOrgList.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(false)

    const publicDatasetJson = await expectJsonResponse<{ id: string }>(
      await createAppClient(switchedHeaders).api.v0.dataset[':id'].$get({
        param: {
          id: seededIds.dataset,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(publicDatasetJson.data.id).toBe(seededIds.dataset)

    const publicRunJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset[':id']['runs'].$get(
        {
          param: {
            id: seededIds.dataset,
          },
          query: {},
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      publicRunJson.data.data.some(
        (entry) => entry.id === seededIds.datasetRun,
      ),
    ).toBe(true)

    const wildcardRunJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset[':id']['runs'].$get(
        {
          param: {
            id: '*',
          },
          query: {},
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      wildcardRunJson.data.data.some(
        (entry) => entry.id === seededIds.datasetRun,
      ),
    ).toBe(false)

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    const secondOrgGlobalList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      secondOrgGlobalList.data.data.some(
        (entry) => entry.id === seededIds.dataset,
      ),
    ).toBe(true)

    const wildcardGlobalRunJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient(switchedHeaders).api.v0.dataset[':id']['runs'].$get(
        {
          param: {
            id: '*',
          },
          query: {},
        },
      ),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      wildcardGlobalRunJson.data.data.some(
        (entry) => entry.id === seededIds.datasetRun,
      ),
    ).toBe(true)
  })

  it('serves public details and anonymous global lists from the standard resource routes while keeping writes authenticated', async () => {
    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    const publicDetailJson = await expectJsonResponse<{ id: string }>(
      await createAppClient().api.v0.dataset[':id'].$get({
        param: {
          id: seededIds.dataset,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(publicDetailJson.data.id).toBe(seededIds.dataset)

    const publicListJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient().api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      publicListJson.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(false)

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'][
        'visibility'
      ].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Dataset visibility updated',
      },
    )

    const globalListJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient().api.v0.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      globalListJson.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(true)

    const writeResponse = await app.request('/api/v0/dataset', {
      method: 'POST',
    })
    expect(writeResponse.status).toBe(401)
  })
})
