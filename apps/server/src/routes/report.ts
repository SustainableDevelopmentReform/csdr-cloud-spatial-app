import { createRoute, z } from '@hono/zod-openapi'
import {
  baseReportSchema,
  createReportSchema,
  fullReportSchema,
  reportQuerySchema,
  reportStoredContentSchema,
  updateReportSchema,
  updateVisibilitySchema,
} from '@repo/schemas/crud'
import { reportTiptapDocumentSchema } from '@repo/schemas/report-content'
import { and, desc, eq, isNull } from 'drizzle-orm'
import {
  buildReportUsageFilters,
  syncReportChartUsages,
} from '~/lib/chartUsage'
import {
  assertCanSetVisibility,
  assertResourceReadable,
  assertResourceWritable,
  buildExplorerReadScope,
  requireOwnedInsertContext,
} from '~/lib/authorization'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { renderReportPdf } from '~/lib/report-pdf'
import {
  buildPublishedReportPdfKey,
  downloadReportPdf,
  uploadReportPdf,
} from '~/lib/report-pdf-storage'
import {
  assertReportDependenciesExternallyVisible,
  getReportVisibilityImpact,
  visibilityImpactSchema,
} from '~/lib/public-visibility'
import { generateJsonResponse } from '~/lib/response'
import { deriveReportSources } from '~/lib/report-sources'
import { authMiddleware } from '~/middlewares/auth'
import { report } from '../schemas/db'
import {
  baseAclColumns,
  createOwnedPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseReportQuery = {
  columns: {
    ...baseAclColumns,
    publishedAt: true,
    publishedByUserId: true,
    publishedPdfKey: true,
  },
} satisfies QueryForTable<'report'>

export const fullReportQuery = {
  columns: {
    ...baseReportQuery.columns,
    content: true,
  },
} satisfies QueryForTable<'report'>

const reportNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get report',
    description: "report you're looking for is not found",
  })

const publishedReportError = () =>
  new ServerError({
    statusCode: 409,
    message: 'Report is published',
    description: 'Published reports are locked and cannot be changed.',
  })

const unpublishedReportPdfError = () =>
  new ServerError({
    statusCode: 409,
    message: 'Failed to get report PDF',
    description:
      'The report must be published before its PDF can be downloaded.',
  })

const visibilityImpactQuerySchema = z.object({
  targetVisibility: updateVisibilitySchema.shape.visibility,
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
  if (content === null) {
    return null
  }

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
  if (content === null) {
    return null
  }

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

const serializeBaseReport = <
  T extends {
    createdAt: Date
    updatedAt: Date
    publishedAt: Date | null
    publishedByUserId: string | null
    publishedPdfKey: string | null
  },
>(
  record: T,
) => {
  const { publishedPdfKey, ...rest } = record

  return {
    ...rest,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    publishedByUserId: record.publishedByUserId,
    publishedPdfAvailable: publishedPdfKey !== null,
  }
}

const fetchFullReport = async (id: string, organizationId: string) => {
  const record = await db.query.report.findFirst({
    where: (table, { and: andFn, eq: eqFn }) =>
      andFn(eqFn(table.id, id), eqFn(table.organizationId, organizationId)),
    ...fullReportQuery,
  })

  return record ?? null
}

const fetchReportLifecycleRecord = async (id: string, organizationId: string) =>
  db.query.report.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      metadata: true,
      content: true,
      organizationId: true,
      createdByUserId: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      publishedByUserId: true,
      publishedPdfKey: true,
    },
    where: (table, { and: andFn, eq: eqFn }) =>
      andFn(eqFn(table.id, id), eqFn(table.organizationId, organizationId)),
  })

const assertReportMutable = (record: { publishedAt: Date | null }) => {
  if (record.publishedAt) {
    throw publishedReportError()
  }
}

const fetchFullReportOrThrow = async (id: string, organizationId: string) => {
  const record = await fetchFullReport(id, organizationId)

  if (!record) {
    throw reportNotFoundError()
  }

  return {
    ...serializeBaseReport(record),
    content: parseStoredReportContentOrThrow(
      reportStoredContentSchema.nullable().parse(record.content),
    ),
    sources: await deriveReportSources(db, record.id),
  }
}

const buildReportPdfFilename = (name: string) => {
  const normalizedName = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${normalizedName.length > 0 ? normalizedName : 'report'}.pdf`
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List reports with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({ permission: 'read:report', scope: 'explorer' }),
      ],
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
        usageFilters.length > 0
          ? and(
              buildExplorerReadScope(
                c,
                report.organizationId,
                report.visibility,
              ),
              ...usageFilters,
            )
          : buildExplorerReadScope(c, report.organizationId, report.visibility)
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
          data: data.map((record) => serializeBaseReport(record)),
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
      middleware: [
        authMiddleware({ permission: 'read:report', scope: 'explorer' }),
      ],
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
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'report',
        resourceId: id,
        scope: 'explorer',
        notFoundError: reportNotFoundError,
      })
      const record = await fetchFullReportOrThrow(
        id,
        accessRecord.organizationId,
      )

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
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)

      const [newReport] = await db
        .insert(report)
        .values(
          createOwnedPayload({
            ...payload,
            organizationId: activeOrganizationId,
            createdByUserId: actor.user.id,
          }),
        )
        .returning()

      if (!newReport) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create report',
          description: 'Report insert did not return a record',
        })
      }

      const record = await fetchFullReportOrThrow(
        newReport.id,
        activeOrganizationId,
      )

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
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'report',
        resourceId: id,
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      assertReportMutable(currentRecord)

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
          .where(
            and(
              eq(report.id, id),
              eq(report.organizationId, accessRecord.organizationId),
              isNull(report.publishedAt),
            ),
          )
          .returning()

        if (!updatedRecord) {
          throw publishedReportError()
        }

        if ('content' in data) {
          await syncReportChartUsages(tx, updatedRecord.id, data.content)
        }

        if (updatedRecord.visibility !== 'private') {
          await assertReportDependenciesExternallyVisible(
            tx,
            updatedRecord.id,
            updatedRecord.visibility,
            accessRecord.organizationId,
          )
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullReportOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, fullRecord, 200, 'Report updated')
    },
  )
  .openapi(
    createRoute({
      description: 'Preview report visibility impact.',
      method: 'get',
      path: '/:id/visibility-impact',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: visibilityImpactQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully previewed report visibility impact.',
          content: {
            'application/json': {
              schema: createResponseSchema(visibilityImpactSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to preview report visibility impact'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { targetVisibility } = c.req.valid('query')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'report',
        resourceId: id,
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      assertReportMutable(currentRecord)

      assertCanSetVisibility({
        actor,
        currentVisibility: accessRecord.visibility,
        nextVisibility: targetVisibility,
      })

      const impact = await db.transaction((tx) =>
        getReportVisibilityImpact(
          tx,
          id,
          targetVisibility,
          accessRecord.organizationId,
        ),
      )

      return generateJsonResponse(c, impact, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'Update report visibility.',
      method: 'patch',
      path: '/:id/visibility',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateVisibilitySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated report visibility.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullReportSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update report visibility'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'report',
        resourceId: id,
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      assertReportMutable(currentRecord)

      const record = await db.transaction(async (tx) => {
        assertCanSetVisibility({
          actor,
          currentVisibility: accessRecord.visibility,
          nextVisibility: payload.visibility,
        })

        const [updatedRecord] = await tx
          .update(report)
          .set(updatePayload(payload))
          .where(
            and(
              eq(report.id, id),
              eq(report.organizationId, accessRecord.organizationId),
              isNull(report.publishedAt),
            ),
          )
          .returning()

        if (!updatedRecord) {
          throw publishedReportError()
        }

        if (updatedRecord.visibility !== 'private') {
          await assertReportDependenciesExternallyVisible(
            tx,
            updatedRecord.id,
            updatedRecord.visibility,
            accessRecord.organizationId,
          )
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullReportOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Report visibility updated',
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Download the published report PDF.',
      method: 'get',
      path: '/:id/pdf',
      middleware: [
        authMiddleware({ permission: 'read:report', scope: 'explorer' }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully downloaded the published report PDF.',
          content: {
            'application/pdf': {
              schema: z.string().openapi({ format: 'binary' }),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to get report PDF'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'report',
        resourceId: id,
        scope: 'explorer',
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      if (!currentRecord.publishedAt || !currentRecord.publishedPdfKey) {
        throw unpublishedReportPdfError()
      }

      const pdfBytes = await downloadReportPdf(currentRecord.publishedPdfKey)

      return c.body(Buffer.from(pdfBytes), 200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        'Content-Disposition': `attachment; filename="${buildReportPdfFilename(currentRecord.name)}"`,
      })
    },
  )
  .openapi(
    createRoute({
      description: 'Publish a report and lock it permanently.',
      method: 'post',
      path: '/:id/publish',
      middleware: [authMiddleware({ permission: 'write:report' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully published a report.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullReportSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to publish report'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'report',
        resourceId: id,
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      assertReportMutable(currentRecord)

      const pdfKey = buildPublishedReportPdfKey(id)
      const pdfBytes = await renderReportPdf({
        reportId: id,
        cookieHeader: c.req.raw.headers.get('cookie'),
      })

      await uploadReportPdf(pdfKey, pdfBytes)

      const [publishedRecord] = await db
        .update(report)
        .set({
          publishedAt: new Date(),
          publishedByUserId: actor.user.id,
          publishedPdfKey: pdfKey,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(report.id, id),
            eq(report.organizationId, accessRecord.organizationId),
            isNull(report.publishedAt),
          ),
        )
        .returning()

      if (!publishedRecord) {
        throw publishedReportError()
      }

      const record = await fetchFullReportOrThrow(
        publishedRecord.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200, 'Report published')
    },
  )
  .openapi(
    createRoute({
      description: 'Duplicate a report into the active organization.',
      method: 'post',
      path: '/:id/duplicate',
      middleware: [
        authMiddleware({
          permission: 'write:report',
          skipResourceCheck: true,
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        201: {
          description: 'Successfully duplicated a report.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullReportSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Report not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to duplicate report'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      const sourceAccessRecord = await assertResourceReadable({
        c,
        resource: 'report',
        resourceId: id,
        scope: 'explorer',
        notFoundError: reportNotFoundError,
      })
      const sourceRecord = await fetchReportLifecycleRecord(
        id,
        sourceAccessRecord.organizationId,
      )

      if (!sourceRecord) {
        throw reportNotFoundError()
      }

      const duplicatedRecord = await db.transaction(async (tx) => {
        const [insertedReport] = await tx
          .insert(report)
          .values(
            createOwnedPayload({
              name: `${sourceRecord.name} (Copy)`,
              description: sourceRecord.description,
              metadata: sourceRecord.metadata,
              content: sourceRecord.content,
              organizationId: activeOrganizationId,
              createdByUserId: actor.user.id,
              visibility: 'private',
              publishedAt: null,
              publishedByUserId: null,
              publishedPdfKey: null,
            }),
          )
          .returning()

        if (!insertedReport) {
          throw new ServerError({
            statusCode: 500,
            message: 'Failed to duplicate report',
            description: 'Report insert did not return a record',
          })
        }

        await syncReportChartUsages(tx, insertedReport.id, sourceRecord.content)

        return insertedReport
      })

      const record = await fetchFullReportOrThrow(
        duplicatedRecord.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, record, 201, 'Report duplicated')
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
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'report',
        resourceId: id,
        notFoundError: reportNotFoundError,
      })
      const currentRecord = await fetchReportLifecycleRecord(
        id,
        accessRecord.organizationId,
      )

      if (!currentRecord) {
        throw reportNotFoundError()
      }

      assertReportMutable(currentRecord)

      const record = await fetchFullReportOrThrow(
        id,
        accessRecord.organizationId,
      )
      const [deletedRecord] = await db
        .delete(report)
        .where(
          and(
            eq(report.id, id),
            eq(report.organizationId, accessRecord.organizationId),
            isNull(report.publishedAt),
          ),
        )
        .returning({
          id: report.id,
        })

      if (!deletedRecord) {
        throw publishedReportError()
      }

      return generateJsonResponse(c, record, 200, 'Report deleted')
    },
  )

export default app
