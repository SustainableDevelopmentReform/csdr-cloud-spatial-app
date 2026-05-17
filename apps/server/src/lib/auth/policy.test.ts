import { describe, expect, it } from 'vitest'
import {
  assertCanGenerateReportPdf,
  requireSuperAdminActor,
  requireTargetOrganizationAdmin,
} from './policy'
import type { RequestActor } from './request-actor'

const isServerErrorLike = (
  value: unknown,
): value is {
  message: string
  response: {
    statusCode: number
    description: string | null
    message: string
  }
} => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'response' in value &&
    typeof value.response === 'object' &&
    value.response !== null &&
    'statusCode' in value.response &&
    typeof value.response.statusCode === 'number' &&
    'description' in value.response &&
    'message' in value.response &&
    typeof value.response.message === 'string'
  )
}

const createActor = (options?: {
  activeOrganizationId?: string | null
  isSuperAdmin?: boolean
  memberships?: RequestActor['memberships']
  organizationRole?: RequestActor['organizationRole']
  twoFactorEnabled?: boolean
}): RequestActor => {
  const user = {
    id: 'user-1',
    name: 'Policy User',
    email: 'policy-user@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    role: options?.isSuperAdmin ? 'super_admin' : 'user',
    banned: false,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: false,
    isAnonymous: false,
  }
  const session = {
    id: 'session-1',
    expiresAt: new Date('2025-01-02T00:00:00.000Z'),
    token: 'session-token',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    userId: user.id,
    impersonatedBy: null,
    activeOrganizationId: options?.activeOrganizationId ?? 'org-1',
  }
  const defaultMember = {
    id: 'member-1',
    organizationId: 'org-1',
    userId: user.id,
    role: options?.organizationRole ?? 'org_viewer',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  }
  const memberships = options?.memberships ?? [defaultMember]
  const activeMember =
    memberships.find(
      (membership) =>
        membership.organizationId ===
        (options?.activeOrganizationId ?? 'org-1'),
    ) ?? null

  return {
    user,
    session,
    memberships,
    activeMember,
    activeOrganizationId: options?.activeOrganizationId ?? 'org-1',
    sessionActiveOrganizationId: options?.activeOrganizationId ?? 'org-1',
    organizationRole: options?.organizationRole ?? 'org_viewer',
    isSuperAdmin: options?.isSuperAdmin ?? false,
    twoFactorEnabled: options?.twoFactorEnabled ?? false,
  }
}

describe('auth policy helpers', () => {
  it('requires MFA-verified super-admin callers', () => {
    expect(() => requireSuperAdminActor(null)).toThrow(
      'User is not authenticated',
    )

    try {
      requireSuperAdminActor(createActor())
      throw new Error('Expected non-super-admin to be rejected')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.message).toBe('User is not authorized')
    }

    try {
      requireSuperAdminActor(createActor({ isSuperAdmin: true }))
      throw new Error('Expected super-admin without MFA to be rejected')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.message).toBe('Two-factor authentication is required')
    }

    expect(
      requireSuperAdminActor(
        createActor({ isSuperAdmin: true, twoFactorEnabled: true }),
      ).isSuperAdmin,
    ).toBe(true)
  })

  it('checks target organization admin role instead of active organization role', () => {
    const actor = createActor({
      activeOrganizationId: 'org-1',
      organizationRole: 'org_creator',
      memberships: [
        {
          id: 'member-1',
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'org_creator',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 'member-2',
          organizationId: 'org-2',
          userId: 'user-1',
          role: 'org_admin',
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ],
    })

    const targetActor = requireTargetOrganizationAdmin({
      actor,
      targetOrganizationId: 'org-2',
    })

    expect(targetActor.activeOrganizationId).toBe('org-2')
    expect(targetActor.organizationRole).toBe('org_admin')

    try {
      requireTargetOrganizationAdmin({
        actor,
        targetOrganizationId: 'org-1',
      })
      throw new Error('Expected non-admin target organization to be rejected')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.message).toBe('User is not authorized')
    }
  })

  it('allows report PDF generation only for org admins and super admins', () => {
    expect(() =>
      assertCanGenerateReportPdf(
        createActor({ organizationRole: 'org_admin' }),
      ),
    ).not.toThrow()
    expect(() =>
      assertCanGenerateReportPdf(createActor({ isSuperAdmin: true })),
    ).not.toThrow()

    try {
      assertCanGenerateReportPdf(
        createActor({ organizationRole: 'org_creator' }),
      )
      throw new Error('Expected org creator to be rejected')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.response.description).toBe(
        'Only org admins or super admins can generate report PDFs.',
      )
    }
  })
})
