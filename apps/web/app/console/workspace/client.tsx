'use client'

import { Badge } from '@repo/ui/components/ui/badge'
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
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import Table from '~/components/table/table'
import { TableShell } from '~/components/table/table-shell'
import { useAccessControl } from '~/hooks/useAccessControl'
import { ConsolePageHeader } from '../_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '../_components/console-simple-breadcrumbs'
import {
  formatOrganizationRole,
  organizationRoleSchema,
} from '~/utils/access-control'
import { useAdminUserSearch } from '~/app/console/super-admin/users/_hooks'
import {
  useAddWorkspaceMember,
  useCancelWorkspaceInvitation,
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceOrganization,
  useUpdateWorkspaceMemberRole,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from './_hooks'

type WorkspaceMember = NonNullable<
  ReturnType<typeof useWorkspaceMembers>['data']
>['members'][number]

type WorkspaceInvitation = NonNullable<
  ReturnType<typeof useWorkspaceInvitations>['data']
>[number]

type CandidateUser = NonNullable<
  ReturnType<typeof useAdminUserSearch>['data']
>[number]

type OrganizationRole = z.infer<typeof organizationRoleSchema>

const MembersTable = ({
  data,
  isLoading,
  isRemoving,
  onRemove,
  onUpdateRole,
}: {
  data: WorkspaceMember[]
  isLoading: boolean
  isRemoving: boolean
  onRemove: (memberId: string) => void
  onUpdateRole: (memberId: string, role: OrganizationRole) => void
}) => {
  const columns = useMemo<ColumnDef<WorkspaceMember>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (member) => member.user.name,
        header: () => <span>Name</span>,
        cell: (info) => info.row.original.user.name,
        minSize: 180,
      },
      {
        id: 'email',
        accessorFn: (member) => member.user.email,
        header: () => <span>Email</span>,
        cell: (info) => info.row.original.user.email,
        minSize: 220,
      },
      {
        id: 'role',
        accessorFn: (member) => member.role,
        header: () => <span>Role</span>,
        cell: (info) => {
          const member = info.row.original

          return (
            <Select
              value={member.role}
              onValueChange={(nextRole) => {
                const parsedRole = organizationRoleSchema.safeParse(nextRole)

                if (!parsedRole.success) {
                  return
                }

                onUpdateRole(member.id, parsedRole.data)
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_admin">Org admin</SelectItem>
                <SelectItem value="org_creator">Org creator</SelectItem>
                <SelectItem value="org_viewer">Org viewer</SelectItem>
              </SelectContent>
            </Select>
          )
        },
        size: 190,
      },
      {
        id: 'action',
        header: () => <span></span>,
        cell: (info) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={isRemoving}
            onClick={() => onRemove(info.row.original.id)}
          >
            Remove
          </Button>
        ),
        size: 120,
      },
    ],
    [isRemoving, onRemove, onUpdateRole],
  )
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table
      table={table}
      isLoading={isLoading}
      emptyStateLabel="No members found in the active organization."
      loadingStateLabel="Loading members..."
    />
  )
}

const CandidateUsersTable = ({
  data,
  existingMemberUserIds,
  existingUserRole,
  isAdding,
  isLoading,
  onAdd,
}: {
  data: CandidateUser[]
  existingMemberUserIds: Set<string>
  existingUserRole: OrganizationRole
  isAdding: boolean
  isLoading: boolean
  onAdd: (userId: string) => void
}) => {
  const columns = useMemo<ColumnDef<CandidateUser>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (candidateUser) => candidateUser.name,
        header: () => <span>Name</span>,
        cell: (info) => info.row.original.name ?? 'Unnamed user',
        minSize: 180,
      },
      {
        id: 'email',
        accessorFn: (candidateUser) => candidateUser.email,
        header: () => <span>Email</span>,
        cell: (info) => info.row.original.email,
        minSize: 220,
      },
      {
        id: 'status',
        header: () => <span>Status</span>,
        cell: (info) => {
          const isExistingMember = existingMemberUserIds.has(
            info.row.original.id,
          )

          return isExistingMember
            ? 'Already a member'
            : `Ready to add as ${formatOrganizationRole(existingUserRole)}`
        },
        minSize: 220,
      },
      {
        id: 'action',
        header: () => <span></span>,
        cell: (info) => {
          const isExistingMember = existingMemberUserIds.has(
            info.row.original.id,
          )

          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={isAdding || isExistingMember}
              onClick={() => onAdd(info.row.original.id)}
            >
              Add to organization
            </Button>
          )
        },
        size: 180,
      },
    ],
    [existingMemberUserIds, existingUserRole, isAdding, onAdd],
  )
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table
      table={table}
      isLoading={isLoading}
      emptyStateLabel="No users matched that search."
      loadingStateLabel="Searching users..."
    />
  )
}

const PendingInvitationsTable = ({
  data,
  isCanceling,
  isLoading,
  onCancel,
}: {
  data: WorkspaceInvitation[]
  isCanceling: boolean
  isLoading: boolean
  onCancel: (invitationId: string) => void
}) => {
  const columns = useMemo<ColumnDef<WorkspaceInvitation>[]>(
    () => [
      {
        id: 'email',
        accessorFn: (invitation) => invitation.email,
        header: () => <span>Email</span>,
        cell: (info) => info.row.original.email,
        minSize: 220,
      },
      {
        id: 'role',
        accessorFn: (invitation) => invitation.role,
        header: () => <span>Role</span>,
        cell: (info) => formatOrganizationRole(info.row.original.role),
        size: 160,
      },
      {
        id: 'status',
        accessorFn: (invitation) => invitation.status,
        header: () => <span>Status</span>,
        cell: (info) => info.row.original.status,
        size: 120,
      },
      {
        id: 'expiresAt',
        accessorFn: (invitation) => invitation.expiresAt,
        header: () => <span>Expires</span>,
        cell: (info) => new Date(info.row.original.expiresAt).toLocaleString(),
        size: 180,
      },
      {
        id: 'action',
        header: () => <span></span>,
        cell: (info) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={isCanceling}
            onClick={() => onCancel(info.row.original.id)}
          >
            Remove
          </Button>
        ),
        size: 120,
      },
    ],
    [isCanceling, onCancel],
  )
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table
      table={table}
      isLoading={isLoading}
      emptyStateLabel="No pending invitations."
      loadingStateLabel="Loading invitations..."
    />
  )
}

const WorkspacePageClient = () => {
  const { access, activeOrganization } = useAccessControl()
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
  const inviteMember = useInviteWorkspaceMember(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const cancelInvitation = useCancelWorkspaceInvitation(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const updateMemberRole = useUpdateWorkspaceMemberRole(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const updateOrganization = useUpdateWorkspaceOrganization(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const removeMember = useRemoveWorkspaceMember(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const addWorkspaceMember = useAddWorkspaceMember(
    activeOrganizationId,
    access.isSuperAdmin,
  )
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] =
    useState<z.infer<typeof organizationRoleSchema>>('org_viewer')
  const [organizationNameDraft, setOrganizationNameDraft] = useState('')
  const [existingUserSearch, setExistingUserSearch] = useState('')
  const deferredExistingUserSearch = useDeferredValue(existingUserSearch)
  const [existingUserRole, setExistingUserRole] =
    useState<z.infer<typeof organizationRoleSchema>>('org_viewer')
  const candidateUsers = useAdminUserSearch(
    deferredExistingUserSearch.trim(),
    access.isSuperAdmin &&
      hasActiveOrganization &&
      deferredExistingUserSearch.trim() !== '',
  )
  const pendingInvitations =
    invitations.data?.filter(
      (invitation) => invitation.status.toLowerCase() === 'pending',
    ) ?? []
  const existingMemberUserIds = new Set(
    (members.data?.members ?? []).map((member) => member.userId),
  )

  useEffect(() => {
    setOrganizationNameDraft(activeOrganization.data?.name ?? '')
  }, [activeOrganization.data?.id, activeOrganization.data?.name])

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs items={[{ label: 'Organization' }]} />
        }
      />
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-medium">Workspace</h1>
        <p className="text-sm text-gray-600">
          {activeOrganization.data?.name ?? 'Select an organization to manage.'}
          {activeOrganization.data?.id && (
            <>
              <Badge variant="outline" className="text-gray-500 font-mono ml-2">
                {activeOrganization.data?.id}
              </Badge>
            </>
          )}
        </p>
      </div>

      <section className="mb-8 border-b border-gray-200 pb-8">
        <h2 className="mb-4 text-xl font-medium">Organization settings</h2>
        {!hasActiveOrganization ? (
          <div className="text-sm text-gray-500">
            Select an organization before editing its name.
          </div>
        ) : (
          <div className="grid max-w-xl gap-3">
            <Input
              placeholder="Organization name"
              value={organizationNameDraft}
              onChange={(event) => setOrganizationNameDraft(event.target.value)}
            />
            <Button
              className="w-fit"
              disabled={
                updateOrganization.isPending ||
                organizationNameDraft.trim() === '' ||
                organizationNameDraft.trim() === activeOrganization.data?.name
              }
              onClick={() => {
                updateOrganization.mutate(
                  {
                    name: organizationNameDraft.trim(),
                  },
                  {
                    onSuccess: () => {
                      toast.success('Organization updated')
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            >
              {updateOrganization.isPending
                ? 'Saving...'
                : 'Update organization'}
            </Button>
          </div>
        )}
      </section>

      <TableShell
        title="Members"
        description={`${members.data?.members.length ?? 0} members in the active organization.`}
      >
        {!hasActiveOrganization ? (
          <div className="text-sm text-muted-foreground">
            Select an organization before managing members.
          </div>
        ) : (
          <MembersTable
            data={members.data?.members ?? []}
            isLoading={members.isLoading}
            isRemoving={removeMember.isPending}
            onRemove={(memberId) => {
              removeMember.mutate(
                { memberIdOrEmail: memberId },
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
            onUpdateRole={(memberId, role) => {
              updateMemberRole.mutate(
                {
                  memberId,
                  role,
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
          />
        )}
      </TableShell>

      {access.isSuperAdmin ? (
        <TableShell
          title="Add Existing User"
          description="Search for an existing user and add them to the active organization."
          toolbar={
            hasActiveOrganization ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  className="w-full md:w-72"
                  placeholder="Search by name or email"
                  value={existingUserSearch}
                  onChange={(event) =>
                    setExistingUserSearch(event.target.value)
                  }
                />
                <Select
                  value={existingUserRole}
                  onValueChange={(nextRole) => {
                    const parsedRole =
                      organizationRoleSchema.safeParse(nextRole)

                    if (!parsedRole.success) {
                      return
                    }

                    setExistingUserRole(parsedRole.data)
                  }}
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">Org admin</SelectItem>
                    <SelectItem value="org_creator">Org creator</SelectItem>
                    <SelectItem value="org_viewer">Org viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null
          }
        >
          {!hasActiveOrganization ? (
            <div className="text-sm text-muted-foreground">
              Select an organization before adding an existing user.
            </div>
          ) : deferredExistingUserSearch.trim() === '' ? (
            <div className="text-sm text-muted-foreground">
              Search for an existing user to add them directly to the active
              organization.
            </div>
          ) : candidateUsers.isError ? (
            <div className="text-sm text-destructive">
              {candidateUsers.error instanceof Error
                ? candidateUsers.error.message
                : 'Failed to search users.'}
            </div>
          ) : (
            <CandidateUsersTable
              data={candidateUsers.data ?? []}
              existingMemberUserIds={existingMemberUserIds}
              existingUserRole={existingUserRole}
              isAdding={addWorkspaceMember.isPending}
              isLoading={candidateUsers.isLoading}
              onAdd={(userId) => {
                addWorkspaceMember.mutate(
                  {
                    role: existingUserRole,
                    userId,
                  },
                  {
                    onSuccess: () => {
                      toast.success('Member added')
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            />
          )}
        </TableShell>
      ) : null}

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

      <TableShell
        title="Pending Invitations"
        description={`${pendingInvitations.length} pending invitations for the active organization.`}
      >
        {!hasActiveOrganization ? (
          <div className="text-sm text-muted-foreground">
            Select an organization before reviewing invitations.
          </div>
        ) : (
          <PendingInvitationsTable
            data={pendingInvitations}
            isCanceling={cancelInvitation.isPending}
            isLoading={invitations.isLoading}
            onCancel={(invitationId) => {
              cancelInvitation.mutate(
                { invitationId },
                {
                  onSuccess: () => {
                    toast.success('Invitation removed')
                  },
                  onError: (error) => {
                    toast.error(error.message)
                  },
                },
              )
            }}
          />
        )}
      </TableShell>
    </div>
  )
}

export default WorkspacePageClient
