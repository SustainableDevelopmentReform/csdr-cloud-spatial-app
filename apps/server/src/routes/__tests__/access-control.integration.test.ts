process.env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC = 'true'

import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { dataset, invitation, member, organization, user } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

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

const FRONTEND_ORIGIN = 'http://localhost:3000'

const createAuthPostHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('content-type', 'application/json')
  requestHeaders.set('origin', FRONTEND_ORIGIN)

  return requestHeaders
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
      await createAppClient(creatorHeaders).api.v0.report[':id'].$patch({
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
      await createAppClient(orgAdminHeaders).api.v0.dataset[':id'].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: 'Only super admins can make this resource public.',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0['indicator-category'][
        ':id'
      ].$patch({
        param: { id: seededIds.indicatorCategory },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Indicator category updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.indicator.measured[
        ':id'
      ].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.geometries[':id'].$patch({
        param: { id: seededIds.geometries },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Geometries updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.product[':id'].$patch({
        param: { id: seededIds.product },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Product updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'].$patch({
        param: {
          id: reportJson.data.id,
        },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    await expectJsonResponse(
      await createAppClient(creatorHeaders).api.v0.report[':id'].$patch({
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

  it('requires MFA for org admins, enforces the last-admin floor, and exposes org-scoped logs only to admins', async () => {
    const noMfaHeaders = await createSessionHeaders({
      email: 'org-admin-no-mfa@example.com',
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

    const orgAdminAuth = createTestAuthClient(orgAdminHeaders)
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

    const auditLogsJson = await expectJsonResponse<{
      data: { resourceType: string; action: string; decision: string }[]
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

    const readLogsJson = await expectJsonResponse<{
      data: { resourceType: string; action: string; decision: string }[]
    }>(
      await createAppClient(orgAdminHeaders).api.v0.logs.read.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      readLogsJson.data.data.some(
        (entry) => entry.resourceType === 'auditLog' && entry.action === 'read',
      ),
    ).toBe(true)
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
    switchedHeaders.delete('x-csdr-active-organization-id')

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

    const apiKeySecondOrgList = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await createAppClient({
        'x-api-key': requireValue(apiKeyResult.data?.key, 'api key'),
        'x-csdr-active-organization-id': secondOrganizationId,
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
  })

  it('serves explorer-visible public resources anonymously and keeps the public namespace read-only', async () => {
    await expectJsonResponse(
      await createAppClient(superAdminHeaders).api.v0.dataset[':id'].$patch({
        param: { id: seededIds.dataset },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )

    const publicDetailJson = await expectJsonResponse<{ id: string }>(
      await createAppClient().api.v0.public.dataset[':id'].$get({
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
      await createAppClient().api.v0.public.dataset.$get({
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(
      publicListJson.data.data.some((entry) => entry.id === seededIds.dataset),
    ).toBe(true)

    const writeResponse = await app.request('/api/v0/public/dataset', {
      method: 'POST',
    })
    expect(writeResponse.status).toBe(404)
  })
})
