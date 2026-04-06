process.env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC = 'true'

import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  product,
  productOutputSummary,
  dataset,
  report,
  reportIndicatorUsage,
  invitation,
  member,
  organization,
  session,
  user,
} from '~/schemas/db'
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

    const readLogsJson = await expectJsonResponse<{
      data: {
        resourceType: string
        action: string
        decision: string
        requestPath: string
      }[]
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
    expect(
      readLogsJson.data.data.some(
        (entry) =>
          entry.resourceType === 'member' &&
          entry.action === 'list' &&
          entry.decision === 'allow',
      ),
    ).toBe(true)

    const datasetRunReadLog = await db.query.readLog.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.requestPath, `/api/v0/dataset/${seededIds.dataset}/runs`),
          eq(table.resourceType, 'datasetRun'),
          eq(table.decision, 'allow'),
        ),
    })
    expect(datasetRunReadLog).toBeDefined()

    const geometriesRunReadLog = await db.query.readLog.findFirst({
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
    expect(geometriesRunReadLog).toBeDefined()
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
