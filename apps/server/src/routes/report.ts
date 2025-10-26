import { createRoute, z } from '@hono/zod-openapi'
import {
  createReportSchema,
  reportQuerySchema,
  updateReportSchema,
} from '@repo/schemas/crud'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  BaseResponseSchema,
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { report } from '../schemas/db'
import {
  baseColumns,
  baseResourceSchema,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'

export const baseReportQuery = {
  columns: {
    ...baseColumns,
  },
} satisfies QueryForTable<'report'>

export const fullReportQuery = {
  columns: { ...baseReportQuery.columns, content: true },
} satisfies QueryForTable<'report'>

export const baseReportSchema = baseResourceSchema.openapi('ReportSchemaBase')
const fullReportSchema = baseReportSchema
  .extend({ content: z.any() })
  .openapi('ReportSchemaFull')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List reports with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:report' })],
      request: {
        query: reportQuerySchema,
      },
      responses: {
        200: {
          description: 'List reports with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseReportSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list reports'),
      },
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(report)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.report.findMany({
        ...baseReportQuery,
        limit: size,
        offset: skip,
        orderBy: desc(report.createdAt),
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
      description: 'Retrieve a report.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a report.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullReportSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch report'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.report.findFirst({
        where: (report, { eq }) => eq(report.id, id),
        ...fullReportQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get report',
          description: "report you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a report.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createReportSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a report.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create report'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const data = {
        ...payload,
      }
      const [newReport] = await db
        .insert(report)
        .values(createPayload(data))
        .returning()

      return generateJsonResponse(c, newReport, 201, 'Report created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a report.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateReportSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a report.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update report'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const data = {
        ...payload,
      }

      const [record] = await db
        .update(report)
        .set(updatePayload(data))
        .where(eq(report.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Report updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a report.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a report.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete report'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(report).where(eq(report.id, id))

      return generateJsonResponse(c, {}, 200, 'Report deleted')
    },
  )

export default app
