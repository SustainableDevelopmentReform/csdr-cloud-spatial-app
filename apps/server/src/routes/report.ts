import { createRoute, z } from '@hono/zod-openapi'
import {
  baseReportSchema,
  createReportSchema,
  fullReportSchema,
  reportQuerySchema,
  reportStoredContentSchema,
  updateReportSchema,
} from '@repo/schemas/crud'
import { reportTiptapDocumentSchema } from '@repo/schemas/report-content'
import { and, desc, eq } from 'drizzle-orm'
import {
  buildReportUsageFilters,
  syncReportChartUsages,
} from '~/lib/chartUsage'
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
import { report } from '../schemas/db'
import {
  baseColumns,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseReportQuery = {
  columns: {
    ...baseColumns,
  },
} satisfies QueryForTable<'report'>

export const fullReportQuery = {
  columns: { ...baseReportQuery.columns, content: true },
} satisfies QueryForTable<'report'>

const reportNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get report',
    description: "report you're looking for is not found",
  })

const mapValidationIssues = (
  issues: {
    path: PropertyKey[]
    message: string
    code: string
  }[],
) =>
  issues.map((issue) => ({
    path:
      issue.path
        .map((part) => (typeof part === 'symbol' ? String(part) : part))
        .join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }))

const parseStoredReportContentOrThrow = (content: unknown) => {
  if (content === null) return null

  const result = reportTiptapDocumentSchema.safeParse(content)

  if (!result.success) {
    throw new ServerError({
      statusCode: 500,
      message: 'Failed to get report',
      description: 'Stored report content is invalid',
      data: {
        issues: mapValidationIssues(result.error.issues),
      },
    })
  }

  return result.data
}

const validateReportContentOrThrow = (content: unknown) => {
  if (content === null) return null

  const result = reportTiptapDocumentSchema.safeParse(content)

  if (!result.success) {
    throw new ServerError({
      statusCode: 422,
      message: 'Validation Error',
      data: {
        issues: mapValidationIssues(result.error.issues),
      },
    })
  }

  return result.data
}

const fetchFullReport = async (id: string) => {
  const record = await db.query.report.findFirst({
    where: (report, { eq }) => eq(report.id, id),
    ...fullReportQuery,
  })

  return record ?? null
}

const fetchFullReportOrThrow = async (id: string) => {
  const record = await fetchFullReport(id)

  if (!record) {
    throw reportNotFoundError()
  }

  return {
    ...record,
    content: parseStoredReportContentOrThrow(
      reportStoredContentSchema.nullable().parse(record.content),
    ),
  }
}

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
      const queryParams = c.req.valid('query')
      const usageFilters = buildReportUsageFilters(queryParams)
      const baseWhere =
        usageFilters.length > 0 ? and(...usageFilters) : undefined
      const { meta, query } = await parseQuery(report, queryParams, {
        defaultOrderBy: desc(report.createdAt),
        searchableColumns: [report.name, report.description],
        baseWhere,
      })

      const data = await db.query.report.findMany({
        ...baseReportQuery,
        ...query,
      })

      return generateJsonResponse(
        c,
        {
          ...meta,
          data,
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
      const record = await fetchFullReportOrThrow(id)

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
              schema: createResponseSchema(fullReportSchema),
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

      if (!newReport) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create report',
          description: 'Report insert did not return a record',
        })
      }

      const record = await fetchFullReportOrThrow(newReport.id)

      return generateJsonResponse(c, record, 201, 'Report created')
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
              schema: createResponseSchema(fullReportSchema),
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

      if ('content' in payload) {
        data.content = validateReportContentOrThrow(payload.content)
      }

      const record = await db.transaction(async (tx) => {
        const [updatedRecord] = await tx
          .update(report)
          .set(updatePayload(data))
          .where(eq(report.id, id))
          .returning()

        if (!updatedRecord) {
          throw reportNotFoundError()
        }

        if ('content' in data) {
          await syncReportChartUsages(tx, updatedRecord.id, data.content)
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullReportOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Report updated')
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
              schema: createResponseSchema(fullReportSchema),
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
      const record = await fetchFullReportOrThrow(id)

      await db.delete(report).where(eq(report.id, id))

      return generateJsonResponse(c, record, 200, 'Report deleted')
    },
  )

export default app
