import { describe, expect, it } from 'vitest'
import {
  buildSessionAccess,
  canChangeConsoleResourceVisibility,
  canEditConsoleResource,
  canManageConsoleChildResource,
  requiresActiveOrganizationSwitchForWrite,
} from '../../../../web/utils/access-control'

describe('web access control helpers', () => {
  it('treats cross-organization resources as read-only even for super admins', () => {
    const access = buildSessionAccess({
      user: {
        id: 'super-admin-user',
        role: 'super_admin',
      },
      activeMember: null,
      activeOrganization: {
        id: 'active-organization',
        name: 'Active organization',
        slug: 'active-organization',
      },
    })

    const crossOrgGlobalIndicator = {
      id: 'indicator-1',
      name: 'Global indicator',
      organizationId: 'other-organization',
      visibility: 'global',
      createdByUserId: 'super-admin-user',
    }

    expect(
      requiresActiveOrganizationSwitchForWrite({
        access,
        resource: 'indicator',
        resourceData: crossOrgGlobalIndicator,
      }),
    ).toBe(true)
    expect(
      canEditConsoleResource({
        access,
        resource: 'indicator',
        resourceData: crossOrgGlobalIndicator,
      }),
    ).toBe(false)
    expect(
      canChangeConsoleResourceVisibility({
        access,
        currentVisibility: 'global',
        resourceData: crossOrgGlobalIndicator,
      }),
    ).toBe(false)
    expect(
      canManageConsoleChildResource({
        access,
        resourceData: {
          product: {
            organizationId: 'other-organization',
          },
        },
      }),
    ).toBe(false)
  })

  it('shows the switch warning for org admins who can edit after switching organizations', () => {
    const access = buildSessionAccess({
      user: {
        id: 'org-admin-user',
        role: 'user',
      },
      activeMember: {
        id: 'member-1',
        organizationId: 'active-organization',
        userId: 'org-admin-user',
        role: 'org_admin',
      },
      activeOrganization: {
        id: 'active-organization',
        name: 'Active organization',
        slug: 'active-organization',
      },
    })

    expect(
      requiresActiveOrganizationSwitchForWrite({
        access,
        resource: 'indicator',
        resourceData: {
          organizationId: 'owning-organization',
          visibility: 'public',
        },
        resourceOrganizationRole: 'org_admin',
      }),
    ).toBe(true)
  })

  it('shows the switch warning for org creators on their own collaborative resources', () => {
    const access = buildSessionAccess({
      user: {
        id: 'org-creator-user',
        role: 'user',
      },
      activeMember: {
        id: 'member-2',
        organizationId: 'active-organization',
        userId: 'org-creator-user',
        role: 'org_creator',
      },
      activeOrganization: {
        id: 'active-organization',
        name: 'Active organization',
        slug: 'active-organization',
      },
    })

    expect(
      requiresActiveOrganizationSwitchForWrite({
        access,
        createdByUserId: 'org-creator-user',
        resource: 'dashboard',
        resourceData: {
          organizationId: 'owning-organization',
          visibility: 'public',
        },
        resourceOrganizationRole: 'org_creator',
      }),
    ).toBe(true)
    expect(
      requiresActiveOrganizationSwitchForWrite({
        access,
        createdByUserId: 'another-user',
        resource: 'dashboard',
        resourceData: {
          organizationId: 'owning-organization',
          visibility: 'public',
        },
        resourceOrganizationRole: 'org_creator',
      }),
    ).toBe(false)
  })
})
