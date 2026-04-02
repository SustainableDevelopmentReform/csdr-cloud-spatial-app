'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { useState } from 'react'
import { z } from 'zod'
import { useAccessControl } from '~/hooks/useAccessControl'
import {
  formatOrganizationRole,
  organizationRoleSchema,
} from '~/utils/access-control'
import {
  useAdminOrganizations,
  useCreateOrganization,
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from './_hooks'

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const WorkspacePageClient = () => {
  const { access, activeOrganization, organizations } = useAccessControl()
  const activeOrganizationId = activeOrganization.data?.id ?? null
  const hasActiveOrganization = activeOrganization.data !== null
  const members = useWorkspaceMembers(
    activeOrganizationId,
    hasActiveOrganization,
    access.isSuperAdmin,
  )
  const invitations = useWorkspaceInvitations(
    activeOrganizationId,
    hasActiveOrganization,
    access.isSuperAdmin,
  )
  const adminOrganizations = useAdminOrganizations(access.isSuperAdmin)
  const inviteMember = useInviteWorkspaceMember(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const updateMemberRole = useUpdateWorkspaceMemberRole(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const removeMember = useRemoveWorkspaceMember(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const createOrganization = useCreateOrganization()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] =
    useState<z.infer<typeof organizationRoleSchema>>('org_viewer')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationSlug, setOrganizationSlug] = useState('')

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-medium">Workspace</h1>
        <p className="text-sm text-gray-600">
          {activeOrganization.data?.name ?? 'Select an organization to manage.'}
        </p>
      </div>

      {access.isSuperAdmin ? (
        <section className="mb-8 border-b border-gray-200 pb-8">
          <h2 className="mb-4 text-xl font-medium">Organizations</h2>
          <div className="mb-6 grid max-w-md gap-3">
            <Input
              placeholder="Organization name"
              value={organizationName}
              onChange={(event) => {
                const nextName = event.target.value
                setOrganizationName(nextName)
                if (organizationSlug.trim() === '') {
                  setOrganizationSlug(slugify(nextName))
                }
              }}
            />
            <Input
              placeholder="organization-slug"
              value={organizationSlug}
              onChange={(event) =>
                setOrganizationSlug(slugify(event.target.value))
              }
            />
            <Button
              className="w-fit"
              disabled={
                createOrganization.isPending ||
                organizationName.trim() === '' ||
                organizationSlug.trim() === ''
              }
              onClick={() => {
                createOrganization.mutate(
                  {
                    name: organizationName.trim(),
                    slug: organizationSlug.trim(),
                  },
                  {
                    onSuccess: async () => {
                      setOrganizationName('')
                      setOrganizationSlug('')
                      toast.success('Organization created')
                      await Promise.all([
                        adminOrganizations.refetch(),
                        organizations.refetch(),
                      ])
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            >
              {createOrganization.isPending
                ? 'Creating...'
                : 'Create organization'}
            </Button>
          </div>

          {adminOrganizations.isLoading ? (
            <div className="text-sm text-gray-500">
              Loading organizations...
            </div>
          ) : null}

          {adminOrganizations.data && adminOrganizations.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Members</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrganizations.data.map((organization) => (
                    <tr
                      key={organization.id}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-2">{organization.name}</td>
                      <td className="px-3 py-2">
                        <code>{organization.slug}</code>
                      </td>
                      <td className="px-3 py-2">{organization.memberCount}</td>
                      <td className="px-3 py-2">
                        {new Date(organization.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-8 border-b border-gray-200 pb-8">
        <h2 className="mb-4 text-xl font-medium">Members</h2>
        {!hasActiveOrganization ? (
          <div className="text-sm text-gray-500">
            Select an organization before managing members.
          </div>
        ) : members.isLoading ? (
          <div className="text-sm text-gray-500">Loading members...</div>
        ) : members.data?.members.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {members.data.members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">{member.user.name}</td>
                    <td className="px-3 py-2">{member.user.email}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={member.role}
                        onValueChange={(nextRole) => {
                          const parsedRole =
                            organizationRoleSchema.safeParse(nextRole)

                          if (!parsedRole.success) {
                            return
                          }

                          updateMemberRole.mutate(
                            {
                              memberId: member.id,
                              role: parsedRole.data,
                            },
                            {
                              onSuccess: () => {
                                toast.success('Member role updated')
                              },
                              onError: (error) => {
                                toast.error(error.message)
                              },
                            },
                          )
                        }}
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org_admin">Org admin</SelectItem>
                          <SelectItem value="org_creator">
                            Org creator
                          </SelectItem>
                          <SelectItem value="org_viewer">Org viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          removeMember.mutate(
                            { memberIdOrEmail: member.id },
                            {
                              onSuccess: () => {
                                toast.success('Member removed')
                              },
                              onError: (error) => {
                                toast.error(error.message)
                              },
                            },
                          )
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No members found in the active organization.
          </div>
        )}
      </section>

      <section className="mb-8 border-b border-gray-200 pb-8">
        <h2 className="mb-4 text-xl font-medium">Invite member</h2>
        {!hasActiveOrganization ? (
          <div className="text-sm text-gray-500">
            Select an organization before sending invitations.
          </div>
        ) : (
          <div className="grid max-w-xl gap-3">
            <Input
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <Select
              value={inviteRole}
              onValueChange={(nextRole) => {
                const parsedRole = organizationRoleSchema.safeParse(nextRole)

                if (!parsedRole.success) {
                  return
                }

                setInviteRole(parsedRole.data)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_admin">Org admin</SelectItem>
                <SelectItem value="org_creator">Org creator</SelectItem>
                <SelectItem value="org_viewer">Org viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-fit"
              disabled={inviteMember.isPending || inviteEmail.trim() === ''}
              onClick={() => {
                inviteMember.mutate(
                  {
                    email: inviteEmail.trim(),
                    role: inviteRole,
                  },
                  {
                    onSuccess: () => {
                      setInviteEmail('')
                      setInviteRole('org_viewer')
                      toast.success('Invitation sent')
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            >
              {inviteMember.isPending ? 'Sending...' : 'Send invitation'}
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-medium">Pending invitations</h2>
        {!hasActiveOrganization ? (
          <div className="text-sm text-gray-500">
            Select an organization before reviewing invitations.
          </div>
        ) : invitations.isLoading ? (
          <div className="text-sm text-gray-500">Loading invitations...</div>
        ) : invitations.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invitations.data.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">{invitation.email}</td>
                    <td className="px-3 py-2">
                      {formatOrganizationRole(invitation.role)}
                    </td>
                    <td className="px-3 py-2">{invitation.status}</td>
                    <td className="px-3 py-2">
                      {new Date(invitation.expiresAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No pending invitations.</div>
        )}
      </section>
    </div>
  )
}

export default WorkspacePageClient
