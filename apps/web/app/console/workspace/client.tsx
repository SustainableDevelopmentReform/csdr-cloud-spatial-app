'use client'

import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { Mail, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { useAccessControl } from '~/hooks/useAccessControl'
import {
  formatOrganizationRole,
  organizationRoleSchema,
} from '~/utils/access-control'
import {
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from './_hooks'

const WorkspacePageClient = () => {
  const { access, activeOrganization, organizations } = useAccessControl()
  const members = useWorkspaceMembers()
  const invitations = useWorkspaceInvitations()
  const inviteMember = useInviteWorkspaceMember()
  const updateMemberRole = useUpdateWorkspaceMemberRole()
  const removeMember = useRemoveWorkspaceMember()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] =
    useState<z.infer<typeof organizationRoleSchema>>('org_viewer')

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-amber-50 to-sky-50 px-6 py-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-gray-500">
              Workspace control
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {activeOrganization.data?.name ?? 'Workspace'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage the active organization, invite collaborators, and keep
              role changes contained to the current workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Your role
            </div>
            <div className="mt-2 text-base font-medium">
              {formatOrganizationRole(access.organizationRole)}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {organizations.data?.length ?? 0} workspaces available
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Members
            </CardTitle>
            <CardDescription>
              Members in the active workspace and their current organization
              roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.isLoading ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                Loading workspace members...
              </div>
            ) : null}
            {members.data?.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{member.user.name}</div>
                  <div className="text-sm text-gray-500">
                    {member.user.email}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                        },
                      )
                    }}
                  >
                    <SelectTrigger className="w-[170px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_admin">Org admin</SelectItem>
                      <SelectItem value="org_creator">Org creator</SelectItem>
                      <SelectItem value="org_viewer">Org viewer</SelectItem>
                    </SelectContent>
                  </Select>
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
                        },
                      )
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {members.data?.members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                No members found in the active workspace.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-4" />
                Invite member
              </CardTitle>
              <CardDescription>
                Send an invitation into the current workspace with a scoped
                organization role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Org admin</SelectItem>
                  <SelectItem value="org_creator">Org creator</SelectItem>
                  <SelectItem value="org_viewer">Org viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="w-full"
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
                    },
                  )
                }}
              >
                {inviteMember.isPending ? 'Sending...' : 'Send invitation'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Pending invitations
              </CardTitle>
              <CardDescription>
                Outstanding invitations for this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitations.data?.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3"
                >
                  <div className="font-medium">{invitation.email}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {formatOrganizationRole(invitation.role)} ·{' '}
                    {invitation.status}
                  </div>
                </div>
              ))}
              {invitations.isLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                  Loading invitations...
                </div>
              ) : null}
              {invitations.data?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                  No pending invitations.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default WorkspacePageClient
