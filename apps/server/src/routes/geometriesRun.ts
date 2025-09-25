import { createRoute } from '@hono/zod-openapi'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import {
  geometries,
  geometriesRun,
  geometryOutput,
  productRun,
} from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { geometryOutputQuery } from './geometryOutput'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  createPayload,
  updatePayload,
} from './util'
import {
  BaseResponseSchema,
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
  z,
} from '~/lib/openapi'

export const geometriesRunQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    geometriesId: true,
  },
  with: {
    geometries: {
      columns: {
        ...baseColumns,
        mainRunId: true,
      },
    },
  },
} satisfies QueryForTable<'geometriesRun'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a geometries run with aggregated metadata.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometriesRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      const geometriesRunRecord = await db.query.geometriesRun.findFirst({
        where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
        ...geometriesRunQuery,
      })

      const outputCount = await db.$count(
        geometryOutput,
        eq(geometryOutput.geometriesRunId, id),
      )

      const productRunCount = await db.$count(
        productRun,
        eq(productRun.geometriesRunId, id),
      )

      if (!geometriesRunRecord) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometriesRun',
          description: "geometriesRun you're looking for is not found",
        })
      }

      return generateJsonResponse(
        c,
        {
          ...geometriesRunRecord,
          outputCount,
          productRunCount,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'List outputs for a geometries run.',
      method: 'get',
      path: '/:id/outputs',
      middleware: [
        authMiddleware({
          permission: 'read:geometryOutput',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'Successfully listed outputs for a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(z.any()),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometry outputs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometryOutput)
        .where(eq(geometryOutput.geometriesRunId, id))
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.geometryOutput.findMany({
        ...geometryOutputQuery,
        where: (geometryOutput, { eq }) =>
          eq(geometryOutput.geometriesRunId, id),
        limit: size,
        offset: skip,
        orderBy: desc(geometryOutput.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          pageCount,
          data,
          totalCount: totalCount[0]!.count,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Create a geometries run.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseCreateResourceSchema.extend({
                geometriesId: z.string(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometries run'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newGeometriesRun] = await db
        .insert(geometriesRun)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(
        c,
        newGeometriesRun,
        201,
        'Geometries run created',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a geometries run.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseUpdateResourceSchema.extend({
                geometriesId: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(geometriesRun)
        .set(updatePayload(payload))
        .where(eq(geometriesRun.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Geometries run updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a geometries run.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a geometries run.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(geometriesRun).where(eq(geometriesRun.id, id))

      return generateJsonResponse(c, {}, 200, 'Geometries run deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Mark a geometries run as the main run for its geometries.',
      method: 'post',
      path: '/:id/set-as-main-run',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description:
            'Successfully marked a geometries run as the main run for its geometries.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to set geometries run as main'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      const run = await db.query.geometriesRun.findFirst({
        where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
      })

      if (!run) {
        throw new ServerError({
          statusCode: 404,
          message: 'Geometries run not found',
          description: `Geometries run with ID ${id} does not exist`,
        })
      }

      await db
        .update(geometries)
        .set({ mainRunId: id })
        .where(eq(geometries.id, run.geometriesId))

      return generateJsonResponse(c, {}, 200, 'Geometries run set as main')
    },
  )

export default app
