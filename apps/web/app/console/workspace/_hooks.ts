'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
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

const adminOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  memberCount: z.number().int(),
})

const adminOrganizationListSchema = z.array(adminOrganizationSchema)

const workspaceQueryKeys = {
  organizations: ['workspace', 'organizations'] as const,
  invitations: (organizationId: string | null) =>
    ['workspace', 'invitations', organizationId] as const,
  members: (organizationId: string | null) =>
    ['workspace', 'members', organizationId] as const,
}

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => null)

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Request failed'
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

const requestApiEndpoint = async <T>(options: {
  apiBaseUrl: string
  method?: 'GET' | 'POST'
  path: string
  schema: z.ZodSchema<T>
  body?: Record<string, string>
  query?: Record<string, string>
}): Promise<T> => {
  const requestUrl = new URL(options.path, options.apiBaseUrl)

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      requestUrl.searchParams.set(key, value)
    }
  }

  const response = await fetch(requestUrl, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers:
      options.body === undefined
        ? undefined
        : {
            'content-type': 'application/json',
          },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = await response.json()

  return z
    .object({
      data: options.schema,
    })
    .parse(payload).data
}

export const useWorkspaceMembers = (
  organizationId: string | null,
  enabled = true,
  isSuperAdmin = false,
) => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()

  return useQuery({
    queryKey: workspaceQueryKeys.members(organizationId),
    queryFn: async () =>
      isSuperAdmin
        ? requestApiEndpoint({
            apiBaseUrl,
            path: '/api/v0/organization/members',
            query:
              organizationId === null
                ? undefined
                : {
                    organizationId,
                  },
            schema: membersResponseSchema,
          })
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
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()

  return useQuery({
    queryKey: workspaceQueryKeys.invitations(organizationId),
    queryFn: async () =>
      isSuperAdmin
        ? requestApiEndpoint({
            apiBaseUrl,
            path: '/api/v0/organization/invitations',
            query:
              organizationId === null
                ? undefined
                : {
                    organizationId,
                  },
            schema: invitationListSchema,
          })
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
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: workspaceQueryKeys.organizations,
    queryFn: () =>
      requestApiEndpoint({
        apiBaseUrl,
        path: '/api/v0/organization',
        schema: adminOrganizationListSchema,
      }),
    enabled,
  })
}

export const useInviteWorkspaceMember = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      email: string
      role: z.infer<typeof organizationRoleSchema>
    }) => {
      if (isSuperAdmin) {
        await requestApiEndpoint({
          apiBaseUrl,
          method: 'POST',
          path: '/api/v0/organization/invite',
          schema: invitationSchema,
          body:
            organizationId === null
              ? payload
              : {
                  ...payload,
                  organizationId,
                },
        })
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
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { invitationId: string }) => {
      if (isSuperAdmin) {
        await requestApiEndpoint({
          apiBaseUrl,
          method: 'POST',
          path: '/api/v0/organization/cancel-invitation',
          schema: invitationSchema,
          body:
            organizationId === null
              ? payload
              : {
                  ...payload,
                  organizationId,
                },
        })
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
  const { apiBaseUrl } = useConfig()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; slug: string }) =>
      requestApiEndpoint({
        apiBaseUrl,
        method: 'POST',
        path: '/api/v0/organization',
        schema: adminOrganizationSchema,
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.organizations,
      })
    },
  })
}

export const useUpdateWorkspaceMemberRole = (
  organizationId: string | null,
  isSuperAdmin = false,
) => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      memberId: string
      role: z.infer<typeof organizationRoleSchema>
    }) => {
      if (isSuperAdmin) {
        await requestApiEndpoint({
          apiBaseUrl,
          method: 'POST',
          path: '/api/v0/organization/member-role',
          schema: memberSchema,
          body:
            organizationId === null
              ? payload
              : {
                  ...payload,
                  organizationId,
                },
        })
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
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { memberIdOrEmail: string }) => {
      if (isSuperAdmin) {
        await requestApiEndpoint({
          apiBaseUrl,
          method: 'POST',
          path: '/api/v0/organization/remove-member',
          schema: z.object({
            id: z.string(),
          }),
          body:
            organizationId === null
              ? payload
              : {
                  ...payload,
                  organizationId,
                },
        })
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
