import { createRoute, z } from '@hono/zod-openapi'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { workflows } from '../schemas/db'
import { QueryForTable } from '../schemas/util'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowSchema,
} from '@repo/schemas/crud'

const workflowsQuery = (userId: string, id?: string) =>
  ({
    columns: {
      id: true,
      name: true,
      userId: true,
      status: true,
      inputParameters: true,
      createdAt: true,
      completedAt: true,
    },
    where: (workflows, { eq, and }) =>
      id
        ? and(eq(workflows.userId, userId), eq(workflows.id, id))
        : eq(workflows.userId, userId),
  }) satisfies QueryForTable<'workflows'>

const workflowsNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get workflow',
    description: "Workflow you're looking for is not found",
  })

const fetchFullworkflows = async (userId: string, id?: string) => {
  const record = await db.query.workflows.findFirst({
    ...workflowsQuery(userId, id),
  })
  return record ?? null
}

const fetchFullworkflowsOrThrow = async (userId: string, id?: string) => {
  const record = await fetchFullworkflows(userId, id)

  if (!record) {
    throw workflowsNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List all workflows.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'read:workflows',
        }),
      ],
      request: {
        query: z.object({ userId: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully listed all workflows.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(workflowSchema),
                  totalCount: z.number().int(),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        500: jsonErrorResponse('Failed to list workflows'),
      },
    }),
    async (c) => {
      const { userId } = c.req.valid('query')
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(workflows)

      const data = await db.query.workflows.findMany({
        ...workflowsQuery(userId),
        orderBy: desc(workflows.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          data,
          totalCount: totalCount[0]!.count,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Get a single workflow.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:workflows' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({ userId: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a workflow.',
          content: {
            'application/json': {
              schema: createResponseSchema(workflowSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('workflow not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch workflow'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { userId } = c.req.valid('query')
      const record = await fetchFullworkflowsOrThrow(userId, id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a workflow.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:workflows',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createWorkflowSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a workflow.',
          content: {
            'application/json': {
              schema: createResponseSchema(workflowSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create workflow'),
      },
    }),
    async (c) => {
      const data = c.req.valid('json')

      // TODO: Should this be included in this endpoint or a seperate endpoint? It needs to be called here to get the id before writing to the DB.
      // Function to POST to Argo Workflows API
      async function submitToArgoWorkflows(input: any) {
        // Replace with your Argo Workflows API endpoint
        const ARGO_API_URL =
          process.env.ARGO_API_URL ||
          'http://argo-server.example.com/api/v1/workflows'
        const response = await fetch(ARGO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add authentication headers if needed
          },
          body: JSON.stringify(input),
        })
        if (!response.ok) {
          throw new ServerError({
            statusCode: 500,
            message: 'Failed to submit workflow to Argo',
            description: await response.text(),
          })
        }
        const argoResult = await response.json()
        // Assume argoResult contains id and name
        return {
          id: argoResult.metadata?.uid || argoResult.id,
          name: argoResult.metadata?.name || argoResult.name,
        }
      }

      // Submit workflow to Argo
      let argoWorkflow
      try {
        argoWorkflow = await submitToArgoWorkflows(data.inputParameters)
      } catch (err) {
        throw err
      }

      // Insert workflow record using Argo response
      const workflowRecord = {
        ...data,
        id: argoWorkflow.id,
        name: argoWorkflow.name,
      }
      const [newworkflows] = await db
        .insert(workflows)
        .values(workflowRecord)
        .returning()

      if (!newworkflows) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create workflows',
          description: 'workflow insert did not return a record',
        })
      }

      const record = await fetchFullworkflowsOrThrow(
        newworkflows.userId,
        newworkflows.id,
      )

      return generateJsonResponse(c, record, 201, 'workflow created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a workflow.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:workflows',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({ userId: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateWorkflowSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a workflow.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('workflow not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update workflow'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { userId } = c.req.valid('query')
      const data = c.req.valid('json')
      const [record] = await db
        .update(workflows)
        .set(data)
        .where(eq(workflows.id, id))
        .returning()

      if (!record) {
        throw workflowsNotFoundError()
      }

      const fullRecord = await fetchFullworkflowsOrThrow(userId, record.id)

      return generateJsonResponse(c, fullRecord, 200, 'workflow updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a workflow.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:workflows',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({ userId: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a workflow.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('workflow not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete workflow'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { userId } = c.req.valid('query')
      const record = await fetchFullworkflowsOrThrow(userId, id)

      await db.delete(workflows).where(eq(workflows.id, id))

      return generateJsonResponse(c, record, 200, 'workflow deleted')
    },
  )

export default app
