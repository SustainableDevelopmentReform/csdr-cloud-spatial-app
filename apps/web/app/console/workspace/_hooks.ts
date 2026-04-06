'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useApiClient } from '~/hooks/useApiClient'
import { useAuthClient } from '~/hooks/useAuthClient'
import { unwrapResponse } from '~/utils/apiClient'
import { organizationRoleSchema } from '~/utils/access-control'

const memberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  role: organizationRoleSchema,
  userId: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable().optional(),
  }),
})

const membersResponseSchema = z.object({
  members: z.array(memberSchema),
  total: z.number(),
})

const invitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: organizationRoleSchema,
  status: z.string(),
  inviterId: z.string(),
  expiresAt: z.union([z.string(), z.date()]),
  createdAt: z.union([z.string(), z.date()]),
})

const invitationListSchema = z.array(invitationSchema)

const workspaceQueryKeys = {
  organizations: ['workspace', 'organizations'] as const,
  invitations: (organizationId: string | null) =>
    ['workspace', 'invitations', organizationId] as const,
  members: (organizationId: string | null) =>
    ['workspace', 'members', organizationId] as const,
}

const getAuthClientErrorMessage = (
  error: {
    message?: string | null
  } | null,
): string => error?.message ?? 'Request failed'

const unwrapAuthClientResponse = <T>(result: {
  data: T | null
  error: {
    message?: string | null
  } | null
}): T => {
  if (result.error) {
    throw new Error(getAuthClientErrorMessage(result.error))
  }

  if (result.data === null) {
    throw new Error('Request failed')
  }

  return result.data
}

export const useWorkspaceMembers = (
  organizationId: string | null,
  enabled = true,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()

  return useQuery({
    queryKey: workspaceQueryKeys.members(organizationId),
    queryFn: async () =>
      isSuperAdmin
        ? (
            await unwrapResponse(
              client.api.v0.organization.members.$get({
                query: organizationId === null ? {} : { organizationId },
              }),
            )
          ).data
        : membersResponseSchema.parse(
            unwrapAuthClientResponse(
              await authClient.organization.listMembers(
                organizationId
                  ? {
                      query: {
                        organizationId,
                      },
                    }
                  : {},
              ),
            ),
          ),
    enabled,
  })
}

export const useWorkspaceInvitations = (
  organizationId: string | null,
  enabled = true,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()

  return useQuery({
    queryKey: workspaceQueryKeys.invitations(organizationId),
    queryFn: async () =>
      isSuperAdmin
        ? (
            await unwrapResponse(
              client.api.v0.organization.invitations.$get({
                query: organizationId === null ? {} : { organizationId },
              }),
            )
          ).data
        : invitationListSchema.parse(
            unwrapAuthClientResponse(
              await authClient.organization.listInvitations(
                organizationId
                  ? {
                      query: {
                        organizationId,
                      },
                    }
                  : {},
              ),
            ),
          ),
    enabled,
  })
}

export const useAdminOrganizations = (enabled = true) => {
  const client = useApiClient()

  return useQuery({
    queryKey: workspaceQueryKeys.organizations,
    queryFn: async () =>
      (await unwrapResponse(client.api.v0.organization.$get())).data,
    enabled,
  })
}

export const useInviteWorkspaceMember = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      email: string
      role: z.infer<typeof organizationRoleSchema>
    }) => {
      if (isSuperAdmin) {
        await unwrapResponse(
          client.api.v0.organization.invite.$post({
            json:
              organizationId === null
                ? payload
                : {
                    ...payload,
                    organizationId,
                  },
          }),
          201,
        )
        return
      }

      unwrapAuthClientResponse(
        await authClient.organization.inviteMember(
          organizationId ? { ...payload, organizationId } : payload,
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'invitations'],
      })
    },
  })
}

export const useCancelWorkspaceInvitation = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { invitationId: string }) => {
      if (isSuperAdmin) {
        invitationSchema.parse(
          (
            await unwrapResponse(
              client.api.v0.organization['cancel-invitation'].$post({
                json:
                  organizationId === null
                    ? payload
                    : {
                        ...payload,
                        organizationId,
                      },
              }),
            )
          ).data,
        )
        return
      }

      unwrapAuthClientResponse(
        await authClient.organization.cancelInvitation(payload),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'invitations'],
      })
    },
  })
}

export const useCreateOrganization = () => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }) =>
      (
        await unwrapResponse(
          client.api.v0.organization.$post({
            json: payload,
          }),
          201,
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.organizations,
      })
    },
  })
}

export const useUpdateWorkspaceOrganization = (
  organizationId: string | null,
) => {
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string }) =>
      unwrapAuthClientResponse(
        await authClient.organization.update(
          organizationId
            ? {
                data: {
                  name: payload.name,
                },
                organizationId,
              }
            : {
                data: {
                  name: payload.name,
                },
              },
        ),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.organizations,
      })
      queryClient.invalidateQueries({
        queryKey: ['access-control'],
      })
    },
  })
}

export const useAddWorkspaceMember = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      role: z.infer<typeof organizationRoleSchema>
      userId: string
    }) => {
      if (!isSuperAdmin) {
        throw new Error('User is not authorized')
      }

      await unwrapResponse(
        client.api.v0.organization['add-member'].$post({
          json:
            organizationId === null
              ? payload
              : {
                  ...payload,
                  organizationId,
                },
        }),
        201,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'members'],
      })
    },
  })
}

export const useUpdateWorkspaceMemberRole = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      memberId: string
      role: z.infer<typeof organizationRoleSchema>
    }) => {
      if (isSuperAdmin) {
        await unwrapResponse(
          client.api.v0.organization['member-role'].$post({
            json:
              organizationId === null
                ? payload
                : {
                    ...payload,
                    organizationId,
                  },
          }),
        )
        return
      }

      unwrapAuthClientResponse(
        await authClient.organization.updateMemberRole(
          organizationId ? { ...payload, organizationId } : payload,
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'members'],
      })
    },
  })
}

export const useRemoveWorkspaceMember = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const client = useApiClient()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { memberIdOrEmail: string }) => {
      if (isSuperAdmin) {
        await unwrapResponse(
          client.api.v0.organization['remove-member'].$post({
            json:
              organizationId === null
                ? payload
                : {
                    ...payload,
                    organizationId,
                  },
          }),
        )
        return
      }

      unwrapAuthClientResponse(
        await authClient.organization.removeMember(
          organizationId ? { ...payload, organizationId } : payload,
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'members'],
      })
      queryClient.invalidateQueries({
        queryKey: ['workspace', 'invitations'],
      })
    },
  })
}
