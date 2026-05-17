import { describe, expect, it } from 'vitest'
import { canReadAccessRecord, type AccessRecord } from './authorization'
import type { RequestActor } from './request-actor'

const createActor = (activeOrganizationId: string | null): RequestActor => {
  const user = {
    id: 'user-1',
    name: 'Authorization User',
    email: 'authorization-user@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    role: 'user',
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
    activeOrganizationId,
  }
  const activeMember: RequestActor['activeMember'] =
    activeOrganizationId === null
      ? null
      : {
          id: 'member-1',
          organizationId: activeOrganizationId,
          userId: user.id,
          role: 'org_viewer',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        }
  const memberships: RequestActor['memberships'] =
    activeMember === null ? [] : [activeMember]

  return {
    user,
    session,
    memberships,
    activeMember,
    activeOrganizationId,
    sessionActiveOrganizationId: activeOrganizationId,
    organizationRole: activeMember === null ? null : 'org_viewer',
    isSuperAdmin: false,
    twoFactorEnabled: false,
  }
}

const createAccessRecord = (options: {
  organizationId: string
  visibility: AccessRecord['visibility']
}): AccessRecord => ({
  organizationId: options.organizationId,
  createdByUserId: 'creator-1',
  visibility: options.visibility,
})

describe('authorization read helpers', () => {
  it('treats public and global direct reads identically', () => {
    expect(
      canReadAccessRecord(
        null,
        createAccessRecord({
          organizationId: 'other-org',
          visibility: 'public',
        }),
      ),
    ).toBe(true)

    expect(
      canReadAccessRecord(
        null,
        createAccessRecord({
          organizationId: 'other-org',
          visibility: 'global',
        }),
      ),
    ).toBe(true)
  })

  it('requires the active owning organization for private direct reads', () => {
    expect(
      canReadAccessRecord(
        null,
        createAccessRecord({
          organizationId: 'org-1',
          visibility: 'private',
        }),
      ),
    ).toBe(false)

    expect(
      canReadAccessRecord(
        createActor('org-1'),
        createAccessRecord({
          organizationId: 'org-1',
          visibility: 'private',
        }),
      ),
    ).toBe(true)

    expect(
      canReadAccessRecord(
        createActor('org-2'),
        createAccessRecord({
          organizationId: 'org-1',
          visibility: 'private',
        }),
      ),
    ).toBe(false)
  })
})
