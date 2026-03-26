'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
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
  invitations: ['workspace', 'invitations'] as const,
  members: ['workspace', 'members'] as const,
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

const requestOrganizationEndpoint = async <T>(options: {
  apiBaseUrl: string
  method?: 'GET' | 'POST'
  path: string
  schema: z.ZodSchema<T>
  body?: Record<string, string>
}): Promise<T> => {
  const response = await fetch(
    `${options.apiBaseUrl}/api/auth/organization${options.path}`,
    {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers:
        options.body === undefined
          ? undefined
          : {
              'content-type': 'application/json',
            },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return options.schema.parse(await response.json())
}

const mutateOrganizationEndpoint = async (options: {
  apiBaseUrl: string
  path: string
  body: Record<string, string>
}) => {
  const response = await fetch(
    `${options.apiBaseUrl}/api/auth/organization${options.path}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(options.body),
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export const useWorkspaceMembers = () => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: workspaceQueryKeys.members,
    queryFn: () =>
      requestOrganizationEndpoint({
        apiBaseUrl,
        path: '/list-members',
        schema: membersResponseSchema,
      }),
  })
}

export const useWorkspaceInvitations = () => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: workspaceQueryKeys.invitations,
    queryFn: () =>
      requestOrganizationEndpoint({
        apiBaseUrl,
        path: '/list-invitations',
        schema: invitationListSchema,
      }),
  })
}

export const useInviteWorkspaceMember = () => {
  const { apiBaseUrl } = useConfig()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      email: string
      role: z.infer<typeof organizationRoleSchema>
    }) =>
      mutateOrganizationEndpoint({
        apiBaseUrl,
        path: '/invite-member',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.invitations,
      })
    },
  })
}

export const useUpdateWorkspaceMemberRole = () => {
  const { apiBaseUrl } = useConfig()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      memberId: string
      role: z.infer<typeof organizationRoleSchema>
    }) =>
      mutateOrganizationEndpoint({
        apiBaseUrl,
        path: '/update-member-role',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.members,
      })
    },
  })
}

export const useRemoveWorkspaceMember = () => {
  const { apiBaseUrl } = useConfig()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { memberIdOrEmail: string }) =>
      mutateOrganizationEndpoint({
        apiBaseUrl,
        path: '/remove-member',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.members,
      })
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.invitations,
      })
    },
  })
}
