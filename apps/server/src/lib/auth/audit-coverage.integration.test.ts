process.env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC = 'false'

import { desc } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { auditLog } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'

const { app, db } = await setupIsolatedTestFile(import.meta.url)

const openApiDocumentSchema = z.object({
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
})

const coveredV0OperationKeys = [
  'DELETE /api/v0/dashboard/:id',
  'DELETE /api/v0/dataset-run/:id',
  'DELETE /api/v0/dataset/:id',
  'DELETE /api/v0/geometries-run/:id',
  'DELETE /api/v0/geometries/:id',
  'DELETE /api/v0/geometry-output/:id',
  'DELETE /api/v0/indicator-category/:id',
  'DELETE /api/v0/indicator/derived/:id',
  'DELETE /api/v0/indicator/measured/:id',
  'DELETE /api/v0/product-run/:id',
  'DELETE /api/v0/product-run/:id/derived-indicators/:assignedDerivedIndicatorId',
  'DELETE /api/v0/product/:id',
  'DELETE /api/v0/report/:id',
  'GET /api/v0/dashboard',
  'GET /api/v0/dashboard/:id',
  'GET /api/v0/dashboard/:id/visibility-impact',
  'GET /api/v0/data-library',
  'GET /api/v0/dataset',
  'GET /api/v0/dataset-run/:id',
  'GET /api/v0/dataset/:id',
  'GET /api/v0/dataset/:id/runs',
  'GET /api/v0/dataset/:id/visibility-impact',
  'GET /api/v0/geometries',
  'GET /api/v0/geometries-run/:id',
  'GET /api/v0/geometries-run/:id/outputs',
  'GET /api/v0/geometries-run/:id/outputs/export',
  'GET /api/v0/geometries-run/:id/outputs/mvt/:z/:x/:y',
  'GET /api/v0/geometries/:id',
  'GET /api/v0/geometries/:id/runs',
  'GET /api/v0/geometries/:id/visibility-impact',
  'GET /api/v0/geometry-output/:id',
  'GET /api/v0/indicator',
  'GET /api/v0/indicator-category',
  'GET /api/v0/indicator-category/:id',
  'GET /api/v0/indicator/:id',
  'GET /api/v0/indicator/derived/:id',
  'GET /api/v0/indicator/derived/:id/visibility-impact',
  'GET /api/v0/indicator/measured/:id',
  'GET /api/v0/indicator/measured/:id/visibility-impact',
  'GET /api/v0/logs/audit',
  'GET /api/v0/logs/audit/super-admin',
  'GET /api/v0/organization',
  'GET /api/v0/organization/invitations',
  'GET /api/v0/organization/members',
  'GET /api/v0/product',
  'GET /api/v0/product-output/:id',
  'GET /api/v0/product-run/:id',
  'GET /api/v0/product-run/:id/derived-indicators',
  'GET /api/v0/product-run/:id/outputs',
  'GET /api/v0/product-run/:id/outputs/export',
  'GET /api/v0/product/:id',
  'GET /api/v0/product/:id/runs',
  'GET /api/v0/product/:id/visibility-impact',
  'GET /api/v0/report',
  'GET /api/v0/report/:id',
  'GET /api/v0/report/:id/pdf',
  'GET /api/v0/report/:id/visibility-impact',
  'PATCH /api/v0/dashboard/:id',
  'PATCH /api/v0/dashboard/:id/visibility',
  'PATCH /api/v0/dataset-run/:id',
  'PATCH /api/v0/dataset/:id',
  'PATCH /api/v0/dataset/:id/visibility',
  'PATCH /api/v0/geometries-run/:id',
  'PATCH /api/v0/geometries/:id',
  'PATCH /api/v0/geometries/:id/visibility',
  'PATCH /api/v0/geometry-output/:id',
  'PATCH /api/v0/indicator-category/:id',
  'PATCH /api/v0/indicator-category/:id/visibility',
  'PATCH /api/v0/indicator/derived/:id',
  'PATCH /api/v0/indicator/derived/:id/visibility',
  'PATCH /api/v0/indicator/measured/:id',
  'PATCH /api/v0/indicator/measured/:id/visibility',
  'PATCH /api/v0/organization',
  'PATCH /api/v0/product-output/:id',
  'PATCH /api/v0/product-run/:id',
  'PATCH /api/v0/product/:id',
  'PATCH /api/v0/product/:id/visibility',
  'PATCH /api/v0/report/:id',
  'PATCH /api/v0/report/:id/visibility',
  'POST /api/v0/dashboard',
  'POST /api/v0/dashboard/:id/duplicate',
  'POST /api/v0/dataset',
  'POST /api/v0/dataset-run',
  'POST /api/v0/dataset-run/:id/set-as-main-run',
  'POST /api/v0/geometries',
  'POST /api/v0/geometries-run',
  'POST /api/v0/geometries-run/:id/set-as-main-run',
  'POST /api/v0/geometry-output',
  'POST /api/v0/geometry-output/bulk',
  'POST /api/v0/geometry-output/import',
  'POST /api/v0/indicator-category',
  'POST /api/v0/indicator/derived',
  'POST /api/v0/indicator/measured',
  'POST /api/v0/organization',
  'POST /api/v0/organization/active',
  'POST /api/v0/organization/add-member',
  'POST /api/v0/organization/cancel-invitation',
  'POST /api/v0/organization/invite',
  'POST /api/v0/organization/member-role',
  'POST /api/v0/organization/remove-member',
  'POST /api/v0/product',
  'POST /api/v0/product-output',
  'POST /api/v0/product-output/bulk',
  'POST /api/v0/product-output/import',
  'POST /api/v0/product-run',
  'POST /api/v0/product-run/:id/compute-derived-indicators',
  'POST /api/v0/product-run/:id/derived-indicators',
  'POST /api/v0/product-run/:id/refresh-summary',
  'POST /api/v0/product-run/:id/set-as-main-run',
  'POST /api/v0/report',
  'POST /api/v0/report/:id/duplicate',
  'POST /api/v0/report/:id/preview-pdf',
  'POST /api/v0/report/:id/publish',
]

const coveredAuthOperationKeys = [
  'GET /api/auth/account-info',
  'GET /api/auth/admin/get-user',
  'GET /api/auth/admin/list-users',
  'GET /api/auth/api-key/get',
  'GET /api/auth/api-key/list',
  'GET /api/auth/callback/{id}',
  'GET /api/auth/delete-user/callback',
  'GET /api/auth/error',
  'GET /api/auth/list-accounts',
  'GET /api/auth/list-sessions',
  'GET /api/auth/ok',
  'GET /api/auth/organization/get-active-member',
  'GET /api/auth/organization/get-active-member-role',
  'GET /api/auth/organization/get-full-organization',
  'GET /api/auth/organization/get-invitation',
  'GET /api/auth/organization/list',
  'GET /api/auth/organization/list-invitations',
  'GET /api/auth/organization/list-members',
  'GET /api/auth/organization/list-user-invitations',
  'GET /api/auth/reset-password/{token}',
  'GET /api/auth/verify-email',
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
  'POST /api/auth/admin/stop-impersonating',
  'POST /api/auth/admin/unban-user',
  'POST /api/auth/admin/update-user',
  'POST /api/auth/api-key/create',
  'POST /api/auth/api-key/delete',
  'POST /api/auth/api-key/update',
  'POST /api/auth/callback/{id}',
  'POST /api/auth/change-email',
  'POST /api/auth/change-password',
  'POST /api/auth/delete-anonymous-user',
  'POST /api/auth/delete-user',
  'POST /api/auth/get-access-token',
  'POST /api/auth/link-social',
  'POST /api/auth/organization/accept-invitation',
  'POST /api/auth/organization/cancel-invitation',
  'POST /api/auth/organization/check-slug',
  'POST /api/auth/organization/create',
  'POST /api/auth/organization/delete',
  'POST /api/auth/organization/has-permission',
  'POST /api/auth/organization/invite-member',
  'POST /api/auth/organization/leave',
  'POST /api/auth/organization/reject-invitation',
  'POST /api/auth/organization/remove-member',
  'POST /api/auth/organization/set-active',
  'POST /api/auth/organization/update',
  'POST /api/auth/organization/update-member-role',
  'POST /api/auth/refresh-token',
  'POST /api/auth/request-password-reset',
  'POST /api/auth/reset-password',
  'POST /api/auth/revoke-other-sessions',
  'POST /api/auth/revoke-session',
  'POST /api/auth/revoke-sessions',
  'POST /api/auth/send-verification-email',
  'POST /api/auth/sign-in/anonymous',
  'POST /api/auth/sign-in/email',
  'POST /api/auth/sign-in/social',
  'POST /api/auth/sign-out',
  'POST /api/auth/sign-up/email',
  'POST /api/auth/two-factor/disable',
  'POST /api/auth/two-factor/enable',
  'POST /api/auth/two-factor/generate-backup-codes',
  'POST /api/auth/two-factor/get-totp-uri',
  'POST /api/auth/two-factor/send-otp',
  'POST /api/auth/two-factor/verify-backup-code',
  'POST /api/auth/two-factor/verify-otp',
  'POST /api/auth/two-factor/verify-totp',
  'POST /api/auth/unlink-account',
  'POST /api/auth/update-session',
  'POST /api/auth/update-user',
  'POST /api/auth/verify-password',
]

const v0ExcludedOperationKeys = new Set([
  'GET /api/v0/healthcheck',
  'GET /api/v0/readiness',
  'GET /api/v0/version',
])

const authExcludedOperationKeys = new Set([
  'GET /api/auth/get-session',
  'POST /api/auth/get-session',
])

const organizationBodies = new Map<string, Record<string, unknown>>([
  [
    'PATCH /api/v0/organization',
    {
      name: 'Renamed Organization',
      organizationId: seededIds.organization,
    },
  ],
  [
    'POST /api/v0/organization',
    {
      name: 'Coverage Organization',
      slug: 'coverage-organization',
    },
  ],
  [
    'POST /api/v0/organization/active',
    {
      organizationId: seededIds.organization,
    },
  ],
  [
    'POST /api/v0/organization/add-member',
    {
      role: 'org_viewer',
      userId: seededIds.adminUser,
    },
  ],
  [
    'POST /api/v0/organization/cancel-invitation',
    {
      invitationId: 'coverage-invitation',
    },
  ],
  [
    'POST /api/v0/organization/invite',
    {
      email: 'coverage-invite@example.com',
      role: 'org_viewer',
    },
  ],
  [
    'POST /api/v0/organization/member-role',
    {
      memberId: 'coverage-member',
      role: 'org_viewer',
    },
  ],
  [
    'POST /api/v0/organization/remove-member',
    {
      memberIdOrEmail: 'coverage-member',
    },
  ],
])

const authBodies = new Map<string, Record<string, unknown>>([
  [
    'POST /api/auth/request-password-reset',
    {
      email: 'coverage@example.com',
      redirectTo: 'http://localhost:3000/reset-password',
    },
  ],
  [
    'POST /api/auth/reset-password',
    {
      newPassword: 'coverage-password',
      token: 'coverage-reset-token',
    },
  ],
])

type Operation = {
  key: string
  method: string
  path: string
}

const sortStrings = (values: string[]) => [...values].sort()

const listOperations = async (
  path: string,
  options: {
    pathPrefix?: string
    excludedKeys?: Set<string>
  } = {},
): Promise<Operation[]> => {
  const response = await app.request(path)
  expect(response.status).toBe(200)

  const document = openApiDocumentSchema.parse(await response.json())
  const operations = Object.entries(document.paths).flatMap(
    ([operationPath, methods]) =>
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

  return operations.filter(
    (operation) => !options.excludedKeys?.has(operation.key),
  )
}

const replaceColonParams = (path: string): string =>
  path
    .replaceAll(':assignedDerivedIndicatorId', 'coverage-assigned-indicator')
    .replaceAll(':id', seededIds.dataset)
    .replaceAll(':z', '0')
    .replaceAll(':x', '0')
    .replaceAll(':y', '0')

const replaceOpenApiParams = (path: string): string =>
  path
    .replaceAll('{id}', 'coverage-provider')
    .replaceAll('{token}', 'coverage-reset-token-in-path')

const requestPathForOperation = (operation: Operation): string =>
  replaceOpenApiParams(replaceColonParams(operation.path))

const bodyForOperation = (
  operation: Operation,
): Record<string, unknown> | null => {
  if (operation.method === 'GET') {
    return null
  }

  return (
    organizationBodies.get(operation.key) ?? authBodies.get(operation.key) ?? {}
  )
}

const requestInitForOperation = (operation: Operation): RequestInit => {
  const body = bodyForOperation(operation)

  if (body === null) {
    return {
      method: operation.method,
    }
  }

  return {
    method: operation.method,
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  }
}

const expectOperationsToMatch = (
  actual: Operation[],
  expectedKeys: string[],
) => {
  expect(sortStrings(actual.map((operation) => operation.key))).toEqual(
    sortStrings(expectedKeys),
  )
}

const expectOperationsToWriteAuditLogs = async (operations: Operation[]) => {
  const missingAuditLogs: string[] = []

  for (const operation of operations) {
    const beforeCount = await db.$count(auditLog)
    await app.request(
      requestPathForOperation(operation),
      requestInitForOperation(operation),
    )
    const afterCount = await db.$count(auditLog)

    if (afterCount <= beforeCount) {
      missingAuditLogs.push(operation.key)
    }
  }

  expect(missingAuditLogs).toEqual([])
}

describe('audit coverage enforcement', () => {
  it('keeps every covered API operation in the explicit audit coverage inventory', async () => {
    const v0Operations = await listOperations('/api/v0/doc', {
      excludedKeys: v0ExcludedOperationKeys,
    })
    const authOperations = await listOperations(
      '/api/auth/open-api/generate-schema',
      {
        excludedKeys: authExcludedOperationKeys,
        pathPrefix: '/api/auth',
      },
    )

    expectOperationsToMatch(v0Operations, coveredV0OperationKeys)
    expectOperationsToMatch(authOperations, coveredAuthOperationKeys)
  })

  it('writes an audit log for every covered API operation', async () => {
    const v0Operations = await listOperations('/api/v0/doc', {
      excludedKeys: v0ExcludedOperationKeys,
    })
    const authOperations = await listOperations(
      '/api/auth/open-api/generate-schema',
      {
        excludedKeys: authExcludedOperationKeys,
        pathPrefix: '/api/auth',
      },
    )

    await expectOperationsToWriteAuditLogs([...v0Operations, ...authOperations])
  })

  it('does not expose the removed read-log endpoint', async () => {
    const response = await app.request('/api/v0/logs/read')

    expect(response.status).toBe(404)
  })

  it('sanitizes token-bearing auth paths in audit logs', async () => {
    const sensitiveToken = 'coverage-sensitive-reset-token'

    await app.request(`/api/auth/reset-password/${sensitiveToken}`)

    const logEntry = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.action, 'reset_password_callback'),
          eq(table.requestMethod, 'GET'),
        ),
      orderBy: desc(auditLog.createdAt),
    })

    expect(logEntry).toBeDefined()
    expect(logEntry?.requestPath).toBe('/api/auth/reset-password/:token')
    expect(JSON.stringify(logEntry)).not.toContain(sensitiveToken)
  })

  it('does not persist auth query strings in audit logs', async () => {
    const queryToken = 'coverage-sensitive-query-token'

    await app.request(
      `/api/auth/admin/get-user?id=coverage-user&token=${queryToken}`,
    )

    const logEntry = await db.query.auditLog.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.action, 'admin_get_user'), eq(table.requestMethod, 'GET')),
      orderBy: desc(auditLog.createdAt),
    })

    expect(logEntry).toBeDefined()
    expect(logEntry?.requestPath).toBe('/api/auth/admin/get-user')
    expect(JSON.stringify(logEntry)).not.toContain(queryToken)
  })
})
