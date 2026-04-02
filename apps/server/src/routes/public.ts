import { createRoute, z } from '@hono/zod-openapi'
import {
  anyBaseIndicatorSchema,
  anyFullIndicatorSchema,
  baseDashboardSchema,
  baseDatasetSchema,
  baseGeometriesSchema,
  baseProductSchema,
  baseReportSchema,
  datasetQuerySchema,
  fullDashboardSchema,
  fullDatasetSchema,
  fullGeometriesSchema,
  fullMeasuredIndicatorSchema,
  fullDerivedIndicatorSchema,
  fullProductSchema,
  fullReportSchema,
  geometriesQuerySchema,
  indicatorCategorySchema,
  indicatorQuerySchema,
  productQuerySchema,
  reportQuerySchema,
  dashboardQuerySchema,
} from '@repo/schemas/crud'
import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import { reportTiptapDocumentSchema } from '@repo/schemas/report-content'
import { authMiddleware } from '~/middlewares/auth'
import {
  assertResourceReadable,
  buildExplorerReadScope,
  type PermissionResourceType,
  readAccessRecord,
} from '~/lib/authorization'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { generateJsonResponse } from '~/lib/response'
import {
  dashboard,
  dataset,
  derivedIndicator,
  geometries,
  indicator,
  indicatorCategory,
  product,
  productOutputSummaryIndicator,
  productRun,
  report,
} from '~/schemas/db'
import { normalizeFilterValues, parseQuery } from '~/utils/query'
import { baseDashboardQuery, fullDashboardQuery } from './dashboard'
import { baseDatasetQuery, fetchFullDatasetOrThrow } from './dataset'
import { baseGeometriesQuery, fetchFullGeometriesOrThrow } from './geometries'
import { indicatorCategoryQuery } from './indicatorCategory'
import {
  baseDerivedIndicatorQuery,
  fetchFullMeasuredIndicatorOrThrow,
  fetchFullDerivedIndicatorOrThrow,
  fullMeasuredIndicatorQuery,
  parseBaseDerivedIndicator,
  parseFullMeasuredIndicator,
} from './indicator'
import {
  baseProductQuery,
  fetchFullProductOrThrow,
  parseBaseProduct,
} from './product'
import { baseReportQuery, fullReportQuery } from './report'
import { dashboardContentSchema } from '@repo/schemas/crud'

const explorerAuth = (
  permission: string,
  targetResource?: PermissionResourceType,
) =>
  authMiddleware({
    permission,
    scope: 'explorer',
    ...(targetResource ? { targetResource } : {}),
  })

const datasetNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get dataset',
    description: "Dataset you're looking for is not found",
  })

const geometriesNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get geometries',
    description: "Geometries you're looking for is not found",
  })

const productNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get product',
    description: "Product you're looking for is not found",
  })

const reportNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get report',
    description: "report you're looking for is not found",
  })

const dashboardNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get dashboard',
    description: "dashboard you're looking for is not found",
  })

const indicatorCategoryNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get indicatorCategory',
    description: "indicatorCategory you're looking for is not found",
  })

const indicatorNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get indicator',
    description: "indicator you're looking for is not found",
  })

const derivedIndicatorNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get derived indicator',
    description: "derived indicator you're looking for is not found",
  })

const fetchPublicReportOrThrow = async (id: string, organizationId: string) => {
  const record = await db.query.report.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, id), eq(table.organizationId, organizationId)),
    ...fullReportQuery,
  })

  if (!record) {
    throw reportNotFoundError()
  }

  return {
    ...record,
    content: reportTiptapDocumentSchema.nullable().parse(record.content),
  }
}

const fetchPublicDashboardOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await db.query.dashboard.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, id), eq(table.organizationId, organizationId)),
    ...fullDashboardQuery,
  })

  if (!record) {
    throw dashboardNotFoundError()
  }

  return {
    ...record,
    content: dashboardContentSchema.parse(record.content),
  }
}

const fetchPublicIndicatorCategoryOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await db.query.indicatorCategory.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, id), eq(table.organizationId, organizationId)),
    ...indicatorCategoryQuery,
  })

  if (!record) {
    throw indicatorCategoryNotFoundError()
  }

  return record
}

const datasetPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible datasets.',
      middleware: [explorerAuth('read:dataset')],
      request: {
        query: datasetQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible datasets.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDatasetSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { datasetIds, excludeDatasetIds } = c.req.valid('query')
      const datasetIdsArray = normalizeFilterValues(datasetIds)
      const excludeDatasetIdsArray = normalizeFilterValues(excludeDatasetIds)
      const baseWhere = and(
        buildExplorerReadScope(c, dataset.organizationId, dataset.visibility),
        datasetIdsArray.length > 0
          ? inArray(dataset.id, datasetIdsArray)
          : undefined,
        excludeDatasetIdsArray.length > 0
          ? notInArray(dataset.id, excludeDatasetIdsArray)
          : undefined,
      )
      const { meta, query } = await parseQuery(dataset, c.req.valid('query'), {
        defaultOrderBy: desc(dataset.createdAt),
        searchableColumns: [dataset.name, dataset.description],
        baseWhere,
      })

      const data = await db.query.dataset.findMany({
        ...baseDatasetQuery,
        ...query,
      })

      return generateJsonResponse(c, { ...meta, data }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible dataset.',
      middleware: [explorerAuth('read:dataset')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Dataset not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'dataset',
        resourceId: id,
        scope: 'explorer',
        notFoundError: datasetNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchFullDatasetOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )

const geometriesPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible geometries.',
      middleware: [explorerAuth('read:geometries')],
      request: {
        query: geometriesQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometriesSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { geometriesIds, excludeGeometriesIds } = c.req.valid('query')
      const geometriesIdsArray = normalizeFilterValues(geometriesIds)
      const excludeGeometriesIdsArray =
        normalizeFilterValues(excludeGeometriesIds)
      const baseWhere = and(
        buildExplorerReadScope(
          c,
          geometries.organizationId,
          geometries.visibility,
        ),
        geometriesIdsArray.length > 0
          ? inArray(geometries.id, geometriesIdsArray)
          : undefined,
        excludeGeometriesIdsArray.length > 0
          ? notInArray(geometries.id, excludeGeometriesIdsArray)
          : undefined,
      )
      const { meta, query } = await parseQuery(
        geometries,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(geometries.createdAt),
          searchableColumns: [geometries.name, geometries.description],
          baseWhere,
        },
      )

      const data = await db.query.geometries.findMany({
        ...baseGeometriesQuery,
        ...query,
      })

      return generateJsonResponse(c, { ...meta, data }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve explorer-visible geometries.',
      middleware: [explorerAuth('read:geometries')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve explorer-visible geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Geometries not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'geometries',
        resourceId: id,
        scope: 'explorer',
        notFoundError: geometriesNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchFullGeometriesOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )

const productPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible products.',
      middleware: [explorerAuth('read:product')],
      request: {
        query: productQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible products.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseProductSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { datasetId, geometriesId, indicatorId, hasRun } =
        c.req.valid('query')
      const datasetIds = normalizeFilterValues(datasetId)
      const geometriesIds = normalizeFilterValues(geometriesId)
      const indicatorIds = normalizeFilterValues(indicatorId)
      const baseWhere = and(
        buildExplorerReadScope(c, product.organizationId, product.visibility),
        datasetIds.length > 0
          ? inArray(product.datasetId, datasetIds)
          : undefined,
        geometriesIds.length > 0
          ? inArray(product.geometriesId, geometriesIds)
          : undefined,
        indicatorIds.length > 0
          ? exists(
              db
                .select({ _: sql`1` })
                .from(productOutputSummaryIndicator)
                .where(
                  and(
                    eq(
                      productOutputSummaryIndicator.productRunId,
                      product.mainRunId,
                    ),
                    or(
                      inArray(
                        productOutputSummaryIndicator.indicatorId,
                        indicatorIds,
                      ),
                      inArray(
                        productOutputSummaryIndicator.derivedIndicatorId,
                        indicatorIds,
                      ),
                    ),
                  ),
                ),
            )
          : undefined,
        hasRun === 'true'
          ? exists(
              db
                .select({ _: sql`1` })
                .from(productRun)
                .where(eq(productRun.productId, product.id)),
            )
          : undefined,
      )
      const { meta, query } = await parseQuery(product, c.req.valid('query'), {
        defaultOrderBy: desc(product.createdAt),
        searchableColumns: [product.id, product.name, product.description],
        baseWhere,
      })

      const data = await db.query.product.findMany({
        ...baseProductQuery,
        ...query,
      })

      return generateJsonResponse(
        c,
        {
          ...meta,
          data: data.map(parseBaseProduct),
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible product.',
      middleware: [explorerAuth('read:product')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible product.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Product not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'product',
        resourceId: id,
        scope: 'explorer',
        notFoundError: productNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchFullProductOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )

const reportPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible reports.',
      middleware: [explorerAuth('read:report')],
      request: {
        query: reportQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible reports.',
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
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { meta, query } = await parseQuery(report, c.req.valid('query'), {
        defaultOrderBy: desc(report.createdAt),
        searchableColumns: [report.name, report.description],
        baseWhere: buildExplorerReadScope(
          c,
          report.organizationId,
          report.visibility,
        ),
      })

      const data = await db.query.report.findMany({
        ...baseReportQuery,
        ...query,
      })

      return generateJsonResponse(c, { ...meta, data }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible report.',
      middleware: [explorerAuth('read:report')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible report.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullReportSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Report not found'),
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

      return generateJsonResponse(
        c,
        await fetchPublicReportOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )

const dashboardPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible dashboards.',
      middleware: [explorerAuth('read:dashboard')],
      request: {
        query: dashboardQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible dashboards.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDashboardSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { meta, query } = await parseQuery(
        dashboard,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(dashboard.createdAt),
          searchableColumns: [dashboard.name, dashboard.description],
          baseWhere: buildExplorerReadScope(
            c,
            dashboard.organizationId,
            dashboard.visibility,
          ),
        },
      )

      const data = await db.query.dashboard.findMany({
        ...baseDashboardQuery,
        ...query,
      })

      return generateJsonResponse(c, { ...meta, data }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible dashboard.',
      middleware: [explorerAuth('read:dashboard')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Dashboard not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'dashboard',
        resourceId: id,
        scope: 'explorer',
        notFoundError: dashboardNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchPublicDashboardOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )

const indicatorCategoryPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible indicator categories.',
      middleware: [explorerAuth('read:indicatorCategory')],
      responses: {
        200: {
          description: 'List explorer-visible indicator categories.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(indicatorCategorySchema),
                  totalCount: z.number().int(),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
      },
    }),
    async (c) => {
      const scopeWhere = buildExplorerReadScope(
        c,
        indicatorCategory.organizationId,
        indicatorCategory.visibility,
      )
      const totalCount = await db
        .select({ count: count() })
        .from(indicatorCategory)
        .where(scopeWhere)
      const data = await db.query.indicatorCategory.findMany({
        ...indicatorCategoryQuery,
        where: scopeWhere,
        orderBy: desc(indicatorCategory.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          data,
          totalCount: totalCount[0]?.count ?? 0,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible indicator category.',
      middleware: [explorerAuth('read:indicatorCategory')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible indicator category.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorCategorySchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Indicator category not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'indicatorCategory',
        resourceId: id,
        scope: 'explorer',
        notFoundError: indicatorCategoryNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchPublicIndicatorCategoryOrThrow(
          id,
          accessRecord.organizationId,
        ),
        200,
      )
    },
  )

const indicatorPublic = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      description: 'List explorer-visible indicators.',
      middleware: [explorerAuth('read:indicator')],
      request: {
        query: indicatorQuerySchema,
      },
      responses: {
        200: {
          description: 'List explorer-visible indicators.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(anyBaseIndicatorSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const { indicatorIds, excludeIndicatorIds, categoryId } =
        c.req.valid('query')
      const indicatorIdsArray = normalizeFilterValues(indicatorIds)
      const excludeIndicatorIdsArray =
        normalizeFilterValues(excludeIndicatorIds)
      const categoryIdsArray = normalizeFilterValues(categoryId)
      const measuredBaseWhere = and(
        buildExplorerReadScope(
          c,
          indicator.organizationId,
          indicator.visibility,
        ),
        indicatorIdsArray.length > 0
          ? inArray(indicator.id, indicatorIdsArray)
          : undefined,
        excludeIndicatorIdsArray.length > 0
          ? notInArray(indicator.id, excludeIndicatorIdsArray)
          : undefined,
        categoryIdsArray.length > 0
          ? inArray(indicator.categoryId, categoryIdsArray)
          : undefined,
      )
      const derivedBaseWhere = and(
        buildExplorerReadScope(
          c,
          derivedIndicator.organizationId,
          derivedIndicator.visibility,
        ),
        indicatorIdsArray.length > 0
          ? inArray(derivedIndicator.id, indicatorIdsArray)
          : undefined,
        excludeIndicatorIdsArray.length > 0
          ? notInArray(derivedIndicator.id, excludeIndicatorIdsArray)
          : undefined,
        categoryIdsArray.length > 0
          ? inArray(derivedIndicator.categoryId, categoryIdsArray)
          : undefined,
      )

      const [indicatorResult, derivedResult] = await Promise.all([
        parseQuery(indicator, c.req.valid('query'), {
          defaultOrderBy: desc(indicator.createdAt),
          searchableColumns: [
            indicator.id,
            indicator.name,
            indicator.description,
          ],
          baseWhere: measuredBaseWhere,
        }),
        parseQuery(derivedIndicator, c.req.valid('query'), {
          defaultOrderBy: desc(derivedIndicator.createdAt),
          searchableColumns: [
            derivedIndicator.id,
            derivedIndicator.name,
            derivedIndicator.description,
          ],
          baseWhere: derivedBaseWhere,
        }),
      ])

      const fetchMeasured =
        c.req.valid('query').type === 'measure' ||
        c.req.valid('query').type === 'all' ||
        c.req.valid('query').type === undefined
      const fetchDerived =
        c.req.valid('query').type === 'derived' ||
        c.req.valid('query').type === 'all' ||
        c.req.valid('query').type === undefined

      const [measuredIndicators, derivedIndicators] = await Promise.all([
        fetchMeasured
          ? db.query.indicator.findMany({
              ...fullMeasuredIndicatorQuery,
              where: indicatorResult.query.where,
            })
          : [],
        fetchDerived
          ? db.query.derivedIndicator.findMany({
              ...baseDerivedIndicatorQuery,
              where: derivedResult.query.where,
            })
          : [],
      ])

      const combined = [
        ...measuredIndicators.map((record) =>
          parseFullMeasuredIndicator(record),
        ),
        ...derivedIndicators.map((record) => parseBaseDerivedIndicator(record)),
      ]
      const sortOrder = c.req.valid('query').order ?? 'desc'
      const sortColumn = c.req.valid('query').sort ?? 'createdAt'

      combined.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortOrder === 'asc' ? -1 : 1
        if (bVal == null) return sortOrder === 'asc' ? 1 : -1
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
      })

      const totalCount =
        (fetchMeasured ? indicatorResult.meta.totalCount : 0) +
        (fetchDerived ? derivedResult.meta.totalCount : 0)
      const pageSize = indicatorResult.query.limit ?? 10
      const pageCount = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0
      const offset = indicatorResult.query.offset ?? 0

      return generateJsonResponse(
        c,
        {
          pageCount,
          totalCount,
          data: combined.slice(offset, offset + pageSize),
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      description: 'Retrieve an explorer-visible indicator.',
      middleware: [
        authMiddleware({
          permission: 'read:indicator',
          scope: 'explorer',
          skipResourceCheck: true,
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(anyFullIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Indicator not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const measuredAccess = await readAccessRecord('indicator', id)

      if (measuredAccess) {
        const accessRecord = await assertResourceReadable({
          c,
          resource: 'indicator',
          resourceId: id,
          scope: 'explorer',
          notFoundError: indicatorNotFoundError,
        })
        const record = await db.query.indicator.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.id, id),
              eq(table.organizationId, accessRecord.organizationId),
            ),
          ...fullMeasuredIndicatorQuery,
        })

        if (!record) {
          throw indicatorNotFoundError()
        }

        return generateJsonResponse(
          c,
          await fetchFullMeasuredIndicatorOrThrow(
            id,
            accessRecord.organizationId,
          ),
          200,
          'Indicator retrieved',
        )
      }

      const derivedAccess = await readAccessRecord('derivedIndicator', id)

      if (derivedAccess) {
        await assertResourceReadable({
          c,
          resource: 'derivedIndicator',
          resourceId: id,
          scope: 'explorer',
          notFoundError: indicatorNotFoundError,
        })

        return generateJsonResponse(
          c,
          await fetchFullDerivedIndicatorOrThrow(
            id,
            derivedAccess.organizationId,
          ),
          200,
          'Indicator retrieved',
        )
      }

      throw indicatorNotFoundError()
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/derived/:id',
      description: 'Retrieve an explorer-visible derived indicator.',
      middleware: [
        authMiddleware({
          permission: 'read:indicator',
          scope: 'explorer',
          targetResource: 'derivedIndicator',
          skipResourceCheck: true,
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDerivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Derived indicator not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'derivedIndicator',
        resourceId: id,
        scope: 'explorer',
        notFoundError: derivedIndicatorNotFoundError,
      })

      return generateJsonResponse(
        c,
        await fetchFullDerivedIndicatorOrThrow(id, accessRecord.organizationId),
        200,
      )
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/measured/:id',
      description: 'Retrieve an explorer-visible measured indicator.',
      middleware: [explorerAuth('read:indicator')],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve an explorer-visible measured indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullMeasuredIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('Anonymous public access is disabled'),
        404: jsonErrorResponse('Measured indicator not found'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'indicator',
        resourceId: id,
        scope: 'explorer',
        notFoundError: indicatorNotFoundError,
      })
      return generateJsonResponse(
        c,
        await fetchFullMeasuredIndicatorOrThrow(
          id,
          accessRecord.organizationId,
        ),
        200,
      )
    },
  )

const app = createOpenAPIApp()
  .route('/dataset', datasetPublic)
  .route('/geometries', geometriesPublic)
  .route('/product', productPublic)
  .route('/report', reportPublic)
  .route('/dashboard', dashboardPublic)
  .route('/indicator-category', indicatorCategoryPublic)
  .route('/indicator', indicatorPublic)

export default app
