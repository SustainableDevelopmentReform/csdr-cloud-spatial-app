import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { and, asc, desc, eq } from 'drizzle-orm'
import { auth, type AuthType } from '~/lib/auth'
import {
  appOrganizationRoleValues,
  getHighestOrganizationRole,
} from '~/lib/access-control'
import {
  persistAccessLog,
  shouldPersistDeniedDecisionLog,
} from '~/lib/access-log'
import { sendOrganizationInvitationEmail } from '~/lib/auth-email'
import { db } from '~/lib/db'
import { env } from '~/env'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { generateJsonResponse } from '~/lib/response'
import {
  type RequestActor,
  requireActiveOrganization,
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from '~/lib/request-actor'
import { invitation, member, organization, session, user } from '~/schemas/db'

const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.iso.datetime(),
  memberCount: z.number().int(),
})

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  organizationId: z.string().min(1).optional(),
})

const setActiveOrganizationSchema = z.object({
  organizationId: z.string().min(1),
})

const organizationTargetQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
})

const organizationSummarySchema = z.object({
  id: z.string(),
  logo: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
})

const organizationRoleSchema = z.enum(appOrganizationRoleValues)

const workspaceMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  role: organizationRoleSchema,
  userId: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
})

const workspaceMembersResponseSchema = z.object({
  members: z.array(workspaceMemberSchema),
  total: z.number().int(),
})

const workspaceInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: organizationRoleSchema,
  status: z.string(),
  inviterId: z.string(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
})

const createWorkspaceInvitationSchema = z.object({
  email: z.string().trim().email(),
  organizationId: z.string().min(1).optional(),
  role: organizationRoleSchema,
})

const addWorkspaceMemberSchema = z.object({
  organizationId: z.string().min(1).optional(),
  role: organizationRoleSchema,
  userId: z.string().min(1),
})

const updateWorkspaceMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  role: organizationRoleSchema,
})

const removeWorkspaceMemberSchema = z.object({
  memberIdOrEmail: z.string().min(1),
  organizationId: z.string().min(1).optional(),
})

const cancelWorkspaceInvitationSchema = z.object({
  invitationId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
})

const ORGANIZATION_INVITATION_EXPIRY_MS = 1000 * 60 * 60 * 48

type AppContext = Context<{
  Variables: AuthType
}>

type OrganizationLogResourceType = 'organization' | 'member' | 'invitation'

type OrganizationRouteLogContext = {
  resourceId: string | null
  targetOrganizationId: string | null
}

const runLoggedSuperAdminAction = async <TResponse extends Response>(options: {
  action: string
  c: AppContext
  resourceType: OrganizationLogResourceType
  run: (
    actor: RequestActor,
    logContext: OrganizationRouteLogContext,
  ) => Promise<TResponse>
}): Promise<TResponse> => {
  const requestActor = options.c.get('requestActor')
  const logContext: OrganizationRouteLogContext = {
    resourceId: null,
    targetOrganizationId: null,
  }

  try {
    const actor = requireSuperAdmin(options.c)
    const response = await options.run(actor, logContext)

    await persistAccessLog({
      actor,
      action: options.action,
      decision: 'allow',
      request: options.c.req.raw,
      resourceType: options.resourceType,
      resourceId: logContext.resourceId,
      statusCode: response.status,
      targetOrganizationId: logContext.targetOrganizationId,
    })

    return response
  } catch (error) {
    if (
      error instanceof ServerError &&
      shouldPersistDeniedDecisionLog(error.response.statusCode)
    ) {
      await persistAccessLog({
        actor: requestActor,
        action: options.action,
        decision: 'deny',
        request: options.c.req.raw,
        resourceType: options.resourceType,
        resourceId: logContext.resourceId,
        statusCode: error.response.statusCode,
        targetOrganizationId: logContext.targetOrganizationId,
      })
    }

    throw error
  }
}

const requireSuperAdmin = (c: AppContext) => {
  const actor = requireAuthenticatedActor(c.get('requestActor'))

  if (!actor.isSuperAdmin) {
    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  }

  requireMfaIfNeeded(actor)

  return actor
}

const resolveSuperAdminOrganizationId = async (options: {
  actor: ReturnType<typeof requireSuperAdmin>
  organizationId: string | undefined
}) => {
  const organizationId =
    options.organizationId ?? requireActiveOrganization(options.actor)
  const currentOrganization = await loadOrganizationSummary(organizationId)

  return currentOrganization.id
}

const ensureOrgAdminFloor = async (options: {
  memberId: string
  nextRole: string | null
  organizationId: string
}) => {
  const organizationMembers = await db.query.member.findMany({
    columns: {
      id: true,
      role: true,
    },
    where: (table, { eq }) => eq(table.organizationId, options.organizationId),
  })

  const currentMember = organizationMembers.find(
    (currentMember) => currentMember.id === options.memberId,
  )

  if (!currentMember) {
    throw new ServerError({
      statusCode: 404,
      message: 'Member not found',
    })
  }

  if (getHighestOrganizationRole(currentMember.role) !== 'org_admin') {
    return
  }

  if (getHighestOrganizationRole(options.nextRole) === 'org_admin') {
    return
  }

  const orgAdminCount = organizationMembers.filter(
    (currentMember) =>
      getHighestOrganizationRole(currentMember.role) === 'org_admin',
  ).length

  if (orgAdminCount <= 1) {
    throw new ServerError({
      statusCode: 400,
      message:
        'An organization must keep at least one org admin. Promote another org admin before removing or demoting this member.',
    })
  }
}

const loadOrganizations = async () => {
  const [organizations, members] = await Promise.all([
    db.query.organization.findMany({
      columns: {
        createdAt: true,
        id: true,
        name: true,
        slug: true,
      },
      orderBy: (table) => asc(table.name),
    }),
    db.query.member.findMany({
      columns: {
        organizationId: true,
      },
    }),
  ])

  const memberCountByOrganizationId = members.reduce<Record<string, number>>(
    (result, currentMember) => {
      const currentCount = result[currentMember.organizationId] ?? 0

      result[currentMember.organizationId] = currentCount + 1

      return result
    },
    {},
  )

  return organizations.map((currentOrganization) => ({
    ...currentOrganization,
    createdAt: currentOrganization.createdAt.toISOString(),
    memberCount: memberCountByOrganizationId[currentOrganization.id] ?? 0,
  }))
}

const loadOrganizationSummary = async (organizationId: string) => {
  const currentOrganization = await db.query.organization.findFirst({
    columns: {
      id: true,
      logo: true,
      name: true,
      slug: true,
    },
    where: (table, { eq }) => eq(table.id, organizationId),
  })

  if (!currentOrganization) {
    throw new ServerError({
      statusCode: 404,
      message: 'Organization not found',
    })
  }

  return currentOrganization
}

const loadOrganizationMemberCount = async (organizationId: string) => {
  const organizationMembers = await db.query.member.findMany({
    columns: {
      id: true,
    },
    where: (table, { eq }) => eq(table.organizationId, organizationId),
  })

  return organizationMembers.length
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List organizations for super admins.',
      responses: {
        200: {
          description: 'List organizations for super admins.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.array(organizationSchema)),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'organization',
        action: 'list',
        run: async () =>
          generateJsonResponse(c, await loadOrganizations(), 200),
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/active',
      description: 'Set the active organization for a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: setActiveOrganizationSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Active organization updated.',
          content: {
            'application/json': {
              schema: createResponseSchema(organizationSummarySchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Organization not found'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'organization',
        action: 'update',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const targetOrganization = await loadOrganizationSummary(
            payload.organizationId,
          )

          logContext.resourceId = targetOrganization.id
          logContext.targetOrganizationId = targetOrganization.id

          await db
            .update(session)
            .set({
              activeOrganizationId: targetOrganization.id,
            })
            .where(eq(session.id, actor.session.id))

          return generateJsonResponse(
            c,
            targetOrganization,
            200,
            'Active organization updated',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/',
      description: 'Create an organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createOrganizationSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Organization created.',
          content: {
            'application/json': {
              schema: createResponseSchema(organizationSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        409: jsonErrorResponse('Organization slug already exists'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'organization',
        action: 'create',
        run: async (_, logContext) => {
          const payload = c.req.valid('json')
          const normalizedName = payload.name.trim()
          const normalizedSlug = payload.slug.trim()

          const existingOrganization = await db.query.organization.findFirst({
            columns: {
              id: true,
            },
            where: (table, { eq }) => eq(table.slug, normalizedSlug),
          })

          if (existingOrganization) {
            throw new ServerError({
              statusCode: 409,
              message: 'Organization slug already exists',
            })
          }

          const createdOrganization = await db.transaction(async (tx) => {
            const now = new Date()
            const organizationId = crypto.randomUUID()

            const [insertedOrganization] = await tx
              .insert(organization)
              .values({
                id: organizationId,
                name: normalizedName,
                slug: normalizedSlug,
                logo: null,
                createdAt: now,
                metadata: null,
              })
              .returning({
                createdAt: organization.createdAt,
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
              })

            if (!insertedOrganization) {
              throw new ServerError({
                statusCode: 500,
                message: 'Failed to create organization',
              })
            }

            return {
              ...insertedOrganization,
              createdAt: insertedOrganization.createdAt.toISOString(),
              memberCount: 0,
            }
          })

          logContext.resourceId = createdOrganization.id
          logContext.targetOrganizationId = createdOrganization.id

          return generateJsonResponse(
            c,
            createdOrganization,
            201,
            'Organization created',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/',
      description: 'Update an organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateOrganizationSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Organization updated.',
          content: {
            'application/json': {
              schema: createResponseSchema(organizationSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Organization not found'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'organization',
        action: 'update',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })
          const normalizedName = payload.name.trim()

          logContext.resourceId = managedOrganizationId
          logContext.targetOrganizationId = managedOrganizationId

          const updatedOrganizations = await db
            .update(organization)
            .set({
              name: normalizedName,
            })
            .where(eq(organization.id, managedOrganizationId))
            .returning({
              createdAt: organization.createdAt,
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
            })

          const updatedOrganization = updatedOrganizations[0]

          if (!updatedOrganization) {
            throw new ServerError({
              statusCode: 404,
              message: 'Organization not found',
            })
          }

          return generateJsonResponse(
            c,
            {
              ...updatedOrganization,
              createdAt: updatedOrganization.createdAt.toISOString(),
              memberCount: await loadOrganizationMemberCount(
                managedOrganizationId,
              ),
            },
            200,
            'Organization updated',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/add-member',
      description:
        'Add an existing user to a target organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: addWorkspaceMemberSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Member added.',
          content: {
            'application/json': {
              schema: createResponseSchema(workspaceMemberSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('User not found'),
        409: jsonErrorResponse('User is already a member of this organization'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'member',
        action: 'create',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const existingUser = await db.query.user.findFirst({
            columns: {
              email: true,
              id: true,
              image: true,
              name: true,
            },
            where: (table, { eq }) => eq(table.id, payload.userId),
          })

          if (!existingUser) {
            throw new ServerError({
              statusCode: 404,
              message: 'User not found',
            })
          }

          const existingMembership = await db.query.member.findFirst({
            columns: {
              id: true,
            },
            where: (table, { and, eq }) =>
              and(
                eq(table.organizationId, managedOrganizationId),
                eq(table.userId, payload.userId),
              ),
          })

          if (existingMembership) {
            throw new ServerError({
              statusCode: 409,
              message: 'User is already a member of this organization',
            })
          }

          const createdMember = await auth.api.addMember({
            body: {
              organizationId: managedOrganizationId,
              role: payload.role,
              userId: payload.userId,
            },
          })
          const createdMemberRole = getHighestOrganizationRole(
            createdMember.role,
          )

          if (createdMemberRole === null) {
            throw new ServerError({
              statusCode: 500,
              message: 'Failed to resolve member role',
            })
          }

          logContext.resourceId = createdMember.id

          return generateJsonResponse(
            c,
            {
              id: createdMember.id,
              organizationId: createdMember.organizationId,
              role: organizationRoleSchema.parse(createdMemberRole),
              user: existingUser,
              userId: createdMember.userId,
            },
            201,
            'Member added',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/members',
      description: 'List members for a target organization as a super admin.',
      request: {
        query: organizationTargetQuerySchema,
      },
      responses: {
        200: {
          description: 'Organization members listed.',
          content: {
            'application/json': {
              schema: createResponseSchema(workspaceMembersResponseSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Organization not found'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'member',
        action: 'list',
        run: async (actor, logContext) => {
          const query = c.req.valid('query')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: query.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const members = await db.query.member.findMany({
            columns: {
              id: true,
              organizationId: true,
              role: true,
              userId: true,
            },
            where: (table, { eq }) =>
              eq(table.organizationId, managedOrganizationId),
            with: {
              user: {
                columns: {
                  email: true,
                  id: true,
                  image: true,
                  name: true,
                },
              },
            },
            orderBy: (table) => asc(table.createdAt),
          })
          const parsedMembers = members.map((currentMember) => ({
            ...currentMember,
            role: organizationRoleSchema.parse(currentMember.role),
          }))

          return generateJsonResponse(
            c,
            {
              members: parsedMembers,
              total: parsedMembers.length,
            },
            200,
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/invitations',
      description:
        'List invitations for a target organization as a super admin.',
      request: {
        query: organizationTargetQuerySchema,
      },
      responses: {
        200: {
          description: 'Organization invitations listed.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.array(workspaceInvitationSchema)),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Organization not found'),
        422: validationErrorResponse,
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'invitation',
        action: 'list',
        run: async (actor, logContext) => {
          const query = c.req.valid('query')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: query.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const invitations = await db.query.invitation.findMany({
            columns: {
              createdAt: true,
              email: true,
              expiresAt: true,
              id: true,
              inviterId: true,
              organizationId: true,
              role: true,
              status: true,
            },
            where: (table, { eq }) =>
              eq(table.organizationId, managedOrganizationId),
            orderBy: (table) => desc(table.createdAt),
          })

          return generateJsonResponse(
            c,
            invitations.map((currentInvitation) => ({
              ...currentInvitation,
              createdAt: currentInvitation.createdAt.toISOString(),
              expiresAt: currentInvitation.expiresAt.toISOString(),
              role: organizationRoleSchema.parse(currentInvitation.role),
            })),
            200,
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/cancel-invitation',
      description:
        'Cancel an invitation in a target organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: cancelWorkspaceInvitationSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Invitation canceled.',
          content: {
            'application/json': {
              schema: createResponseSchema(workspaceInvitationSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Invitation not found'),
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'invitation',
        action: 'cancel',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const existingInvitation = await db.query.invitation.findFirst({
            columns: {
              createdAt: true,
              email: true,
              expiresAt: true,
              id: true,
              inviterId: true,
              organizationId: true,
              role: true,
              status: true,
            },
            where: (table, { and, eq }) =>
              and(
                eq(table.id, payload.invitationId),
                eq(table.organizationId, managedOrganizationId),
              ),
          })

          if (!existingInvitation) {
            throw new ServerError({
              statusCode: 404,
              message: 'Invitation not found',
            })
          }

          logContext.resourceId = existingInvitation.id

          const updatedInvitations = await db
            .update(invitation)
            .set({
              status: 'canceled',
            })
            .where(eq(invitation.id, existingInvitation.id))
            .returning({
              createdAt: invitation.createdAt,
              email: invitation.email,
              expiresAt: invitation.expiresAt,
              id: invitation.id,
              inviterId: invitation.inviterId,
              organizationId: invitation.organizationId,
              role: invitation.role,
              status: invitation.status,
            })

          const updatedInvitation = updatedInvitations[0]

          if (!updatedInvitation) {
            throw new ServerError({
              statusCode: 404,
              message: 'Invitation not found',
            })
          }

          return generateJsonResponse(
            c,
            {
              ...updatedInvitation,
              createdAt: updatedInvitation.createdAt.toISOString(),
              expiresAt: updatedInvitation.expiresAt.toISOString(),
              role: organizationRoleSchema.parse(updatedInvitation.role),
            },
            200,
            'Invitation canceled',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/invite',
      description: 'Invite a member to a target organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createWorkspaceInvitationSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Invitation created.',
          content: {
            'application/json': {
              schema: createResponseSchema(workspaceInvitationSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        409: jsonErrorResponse('User is already invited to this organization'),
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'invitation',
        action: 'invite',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })
          const normalizedEmail = payload.email.trim().toLowerCase()
          const currentOrganization = await loadOrganizationSummary(
            managedOrganizationId,
          )

          logContext.targetOrganizationId = managedOrganizationId

          const existingMember = await db
            .select({
              id: member.id,
            })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .where(
              and(
                eq(member.organizationId, managedOrganizationId),
                eq(user.email, normalizedEmail),
              ),
            )
            .limit(1)

          if (existingMember[0]) {
            throw new ServerError({
              statusCode: 409,
              message: 'User is already a member of this organization',
            })
          }

          const pendingInvitation = await db.query.invitation.findFirst({
            columns: {
              id: true,
            },
            where: (table, { and, eq }) =>
              and(
                eq(table.organizationId, managedOrganizationId),
                eq(table.email, normalizedEmail),
                eq(table.status, 'pending'),
              ),
          })

          if (pendingInvitation) {
            throw new ServerError({
              statusCode: 409,
              message: 'User is already invited to this organization',
            })
          }

          const now = new Date()
          const createdInvitation = await db
            .insert(invitation)
            .values({
              id: crypto.randomUUID(),
              organizationId: managedOrganizationId,
              email: normalizedEmail,
              role: payload.role,
              status: 'pending',
              expiresAt: new Date(
                now.getTime() + ORGANIZATION_INVITATION_EXPIRY_MS,
              ),
              createdAt: now,
              inviterId: actor.user.id,
            })
            .returning({
              createdAt: invitation.createdAt,
              email: invitation.email,
              expiresAt: invitation.expiresAt,
              id: invitation.id,
              inviterId: invitation.inviterId,
              organizationId: invitation.organizationId,
              role: invitation.role,
              status: invitation.status,
            })

          const insertedInvitation = createdInvitation[0]

          if (!insertedInvitation) {
            throw new ServerError({
              statusCode: 500,
              message: 'Failed to create invitation',
            })
          }

          logContext.resourceId = insertedInvitation.id

          const acceptUrl = new URL(
            `/accept-invitation/${insertedInvitation.id}`,
            env.APP_URL,
          )

          await sendOrganizationInvitationEmail({
            acceptUrl: acceptUrl.toString(),
            email: insertedInvitation.email,
            invitationId: insertedInvitation.id,
            inviterEmail: actor.user.email,
            inviterName: actor.user.name,
            organizationName: currentOrganization.name,
            role: payload.role,
          })

          return generateJsonResponse(
            c,
            {
              ...insertedInvitation,
              createdAt: insertedInvitation.createdAt.toISOString(),
              expiresAt: insertedInvitation.expiresAt.toISOString(),
              role: organizationRoleSchema.parse(insertedInvitation.role),
            },
            201,
            'Invitation created',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/member-role',
      description:
        'Update a member role in a target organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateWorkspaceMemberRoleSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Member role updated.',
          content: {
            'application/json': {
              schema: createResponseSchema(workspaceMemberSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Member not found'),
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'member',
        action: 'update',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const existingMember = await db.query.member.findFirst({
            columns: {
              id: true,
              organizationId: true,
              role: true,
              userId: true,
            },
            where: (table, { and, eq }) =>
              and(
                eq(table.id, payload.memberId),
                eq(table.organizationId, managedOrganizationId),
              ),
          })

          if (!existingMember) {
            throw new ServerError({
              statusCode: 404,
              message: 'Member not found',
            })
          }

          logContext.resourceId = existingMember.id

          await ensureOrgAdminFloor({
            memberId: existingMember.id,
            nextRole: payload.role,
            organizationId: managedOrganizationId,
          })

          const updatedMembers = await db
            .update(member)
            .set({
              role: payload.role,
            })
            .where(eq(member.id, existingMember.id))
            .returning({
              id: member.id,
              organizationId: member.organizationId,
              role: member.role,
              userId: member.userId,
            })

          const updatedMember = updatedMembers[0]

          if (!updatedMember) {
            throw new ServerError({
              statusCode: 404,
              message: 'Member not found',
            })
          }

          const relatedUser = await db.query.user.findFirst({
            columns: {
              email: true,
              id: true,
              image: true,
              name: true,
            },
            where: (table, { eq }) => eq(table.id, updatedMember.userId),
          })

          if (!relatedUser) {
            throw new ServerError({
              statusCode: 404,
              message: 'User not found',
            })
          }

          return generateJsonResponse(
            c,
            {
              ...updatedMember,
              role: organizationRoleSchema.parse(updatedMember.role),
              user: relatedUser,
            },
            200,
            'Member role updated',
          )
        },
      }),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/remove-member',
      description:
        'Remove a member from a target organization as a super admin.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: removeWorkspaceMemberSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Member removed.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  id: z.string(),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Forbidden'),
        404: jsonErrorResponse('Member not found'),
      },
    }),
    async (c) =>
      runLoggedSuperAdminAction({
        c,
        resourceType: 'member',
        action: 'delete',
        run: async (actor, logContext) => {
          const payload = c.req.valid('json')
          const managedOrganizationId = await resolveSuperAdminOrganizationId({
            actor,
            organizationId: payload.organizationId,
          })

          logContext.targetOrganizationId = managedOrganizationId

          const existingMember = payload.memberIdOrEmail.includes('@')
            ? await db
                .select({
                  id: member.id,
                  organizationId: member.organizationId,
                  role: member.role,
                  userId: member.userId,
                })
                .from(member)
                .innerJoin(user, eq(member.userId, user.id))
                .where(
                  and(
                    eq(member.organizationId, managedOrganizationId),
                    eq(
                      user.email,
                      payload.memberIdOrEmail.trim().toLowerCase(),
                    ),
                  ),
                )
                .limit(1)
                .then((members) => members[0] ?? null)
            : await db.query.member.findFirst({
                columns: {
                  id: true,
                  organizationId: true,
                  role: true,
                  userId: true,
                },
                where: (table, { and, eq }) =>
                  and(
                    eq(table.id, payload.memberIdOrEmail),
                    eq(table.organizationId, managedOrganizationId),
                  ),
              })

          if (!existingMember) {
            throw new ServerError({
              statusCode: 404,
              message: 'Member not found',
            })
          }

          logContext.resourceId = existingMember.id

          await ensureOrgAdminFloor({
            memberId: existingMember.id,
            nextRole: null,
            organizationId: managedOrganizationId,
          })

          await db.transaction(async (tx) => {
            await tx.delete(member).where(eq(member.id, existingMember.id))

            const nextMembership = await tx.query.member.findFirst({
              columns: {
                organizationId: true,
              },
              where: (table, { and, eq, ne }) =>
                and(
                  eq(table.userId, existingMember.userId),
                  ne(table.organizationId, managedOrganizationId),
                ),
              orderBy: (table, { asc }) => asc(table.createdAt),
            })

            await tx
              .update(session)
              .set({
                activeOrganizationId: nextMembership?.organizationId ?? null,
              })
              .where(
                and(
                  eq(session.userId, existingMember.userId),
                  eq(session.activeOrganizationId, managedOrganizationId),
                ),
              )
          })

          return generateJsonResponse(
            c,
            {
              id: existingMember.id,
            },
            200,
            'Member removed',
          )
        },
      }),
  )

export default app
