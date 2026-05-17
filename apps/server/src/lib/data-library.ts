import type { z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type {
  dataLibraryQuerySchema,
  dataLibraryResourceTypeSchema,
  visibilitySchema,
} from '@repo/schemas/crud'
import {
  and,
  ilike,
  inArray,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm'
import { buildResourceListReadScope } from '~/lib/auth/authorization'
import type { AuthType } from '~/lib/auth'
import { db } from '~/lib/db'
import {
  buildGeometryIntersectsFilter,
  getBoundsFilterEnvelope,
} from '~/lib/geographic-bounds'
import {
  dataset,
  datasetRun,
  geometries,
  geometryOutput,
  product,
  productOutputSummary,
} from '~/schemas/db'

type DataLibraryResourceType = z.infer<typeof dataLibraryResourceTypeSchema>
type DataLibraryQuery = z.infer<typeof dataLibraryQuerySchema>
type DataLibrarySort = NonNullable<DataLibraryQuery['sort']>
type ResourceVisibility = z.infer<typeof visibilitySchema>
type DataLibraryContext = Context<{ Variables: AuthType }>

type DataLibraryRecord = {
  id: string
  name: string
  description: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
  organizationId: string
  createdByUserId: string | null
  visibility: ResourceVisibility
  resourceType: DataLibraryResourceType
}

type DataLibraryCountRow = {
  totalCount: number
}

type DataLibraryListResult = {
  pageCount: number
  totalCount: number
  data: DataLibraryRecord[]
}

const normalizeResourceTypes = (
  resourceType: DataLibraryQuery['resourceType'],
): DataLibraryResourceType[] => {
  if (!resourceType) {
    return []
  }

  return Array.isArray(resourceType) ? resourceType : [resourceType]
}

const includesResourceType = (
  resourceTypes: DataLibraryResourceType[],
  resourceType: DataLibraryResourceType,
): boolean => resourceTypes.length === 0 || resourceTypes.includes(resourceType)

const buildSearchFilter = (options: {
  descriptionColumn: AnyColumn
  nameColumn: AnyColumn
  searchValue: string | undefined
}): SQL | undefined => {
  if (!options.searchValue) {
    return undefined
  }

  return or(
    ilike(options.nameColumn, `%${options.searchValue}%`),
    ilike(options.descriptionColumn, `%${options.searchValue}%`),
    sql`${options.searchValue} <% ${options.nameColumn}`,
    sql`${options.searchValue} <% ${options.descriptionColumn}`,
  )
}

const buildDataLibraryOrderBy = (
  sort: DataLibrarySort | undefined,
  order: DataLibraryQuery['order'],
): SQL => {
  const direction = order === 'asc' ? sql`asc` : sql`desc`
  const sortKey = sort ?? 'updatedAt'

  switch (sortKey) {
    case 'name':
      return sql`data_library_resources.name ${direction}, data_library_resources."resourceType" asc, data_library_resources.id asc`
    case 'createdAt':
      return sql`data_library_resources."createdAt" ${direction}, data_library_resources."resourceType" asc, data_library_resources.id asc`
    case 'updatedAt':
      return sql`data_library_resources."updatedAt" ${direction}, data_library_resources."resourceType" asc, data_library_resources.id asc`
  }
}

const whereOrTrue = (where: SQL | undefined) => where ?? sql`true`

const selectDatasetResources = (where: SQL | undefined): SQL => {
  return sql`
    select
      ${dataset.id} as id,
      ${dataset.name} as name,
      ${dataset.description} as description,
      ${dataset.metadata} as metadata,
      ${dataset.createdAt} as "createdAt",
      ${dataset.updatedAt} as "updatedAt",
      ${dataset.organizationId} as "organizationId",
      ${dataset.createdByUserId} as "createdByUserId",
      ${dataset.visibility} as visibility,
      ${'dataset'} as "resourceType"
    from ${dataset}
    where ${whereOrTrue(where)}
  `
}

const selectBoundaryResources = (where: SQL | undefined): SQL => {
  return sql`
    select
      ${geometries.id} as id,
      ${geometries.name} as name,
      ${geometries.description} as description,
      ${geometries.metadata} as metadata,
      ${geometries.createdAt} as "createdAt",
      ${geometries.updatedAt} as "updatedAt",
      ${geometries.organizationId} as "organizationId",
      ${geometries.createdByUserId} as "createdByUserId",
      ${geometries.visibility} as visibility,
      ${'boundary'} as "resourceType"
    from ${geometries}
    where ${whereOrTrue(where)}
  `
}

const selectProductResources = (where: SQL | undefined): SQL => {
  return sql`
    select
      ${product.id} as id,
      ${product.name} as name,
      ${product.description} as description,
      ${product.metadata} as metadata,
      ${product.createdAt} as "createdAt",
      ${product.updatedAt} as "updatedAt",
      ${product.organizationId} as "organizationId",
      ${product.createdByUserId} as "createdByUserId",
      ${product.visibility} as visibility,
      ${'product'} as "resourceType"
    from ${product}
    where ${whereOrTrue(where)}
  `
}

export const listDataLibraryResources = async (
  c: DataLibraryContext,
  queryParams: DataLibraryQuery,
): Promise<DataLibraryListResult> => {
  const resourceTypes = normalizeResourceTypes(queryParams.resourceType)
  const boundsEnvelope = getBoundsFilterEnvelope(queryParams)
  const searchValue = queryParams.search?.trim() || undefined
  const page = queryParams.page && queryParams.page > 0 ? queryParams.page : 1
  const size = queryParams.size && queryParams.size > 0 ? queryParams.size : 10
  const offset = (page - 1) * size
  const resourceSelects: SQL[] = []

  if (includesResourceType(resourceTypes, 'dataset')) {
    resourceSelects.push(
      selectDatasetResources(
        and(
          buildResourceListReadScope(
            c,
            dataset.organizationId,
            dataset.visibility,
          ),
          buildSearchFilter({
            nameColumn: dataset.name,
            descriptionColumn: dataset.description,
            searchValue,
          }),
          boundsEnvelope
            ? inArray(
                dataset.mainRunId,
                db
                  .select({ id: datasetRun.id })
                  .from(datasetRun)
                  .where(
                    buildGeometryIntersectsFilter(
                      datasetRun.bounds,
                      boundsEnvelope,
                    ),
                  ),
              )
            : undefined,
        ),
      ),
    )
  }

  if (includesResourceType(resourceTypes, 'boundary')) {
    resourceSelects.push(
      selectBoundaryResources(
        and(
          buildResourceListReadScope(
            c,
            geometries.organizationId,
            geometries.visibility,
          ),
          buildSearchFilter({
            nameColumn: geometries.name,
            descriptionColumn: geometries.description,
            searchValue,
          }),
          boundsEnvelope
            ? inArray(
                geometries.mainRunId,
                db
                  .select({ id: geometryOutput.geometriesRunId })
                  .from(geometryOutput)
                  .where(
                    buildGeometryIntersectsFilter(
                      geometryOutput.geometry,
                      boundsEnvelope,
                    ),
                  ),
              )
            : undefined,
        ),
      ),
    )
  }

  if (includesResourceType(resourceTypes, 'product')) {
    resourceSelects.push(
      selectProductResources(
        and(
          buildResourceListReadScope(
            c,
            product.organizationId,
            product.visibility,
          ),
          buildSearchFilter({
            nameColumn: product.name,
            descriptionColumn: product.description,
            searchValue,
          }),
          boundsEnvelope
            ? inArray(
                product.mainRunId,
                db
                  .select({ id: productOutputSummary.productRunId })
                  .from(productOutputSummary)
                  .where(
                    buildGeometryIntersectsFilter(
                      productOutputSummary.bounds,
                      boundsEnvelope,
                    ),
                  ),
              )
            : undefined,
        ),
      ),
    )
  }

  if (resourceSelects.length === 0) {
    return {
      pageCount: 0,
      totalCount: 0,
      data: [],
    }
  }

  const unionedResources = sql.join(resourceSelects, sql` union all `)
  const resourceQuery = sql`(${unionedResources})`
  const countResult = await db.execute<DataLibraryCountRow>(sql`
    select count(*)::int as "totalCount"
    from ${resourceQuery} as data_library_resources
  `)
  const totalCount = countResult.rows[0]?.totalCount ?? 0
  const pageCount = size > 0 ? Math.ceil(totalCount / size) : 0
  const recordsResult = await db.execute<DataLibraryRecord>(sql`
    select
      data_library_resources.id,
      data_library_resources.name,
      data_library_resources.description,
      data_library_resources.metadata,
      data_library_resources."createdAt",
      data_library_resources."updatedAt",
      data_library_resources."organizationId",
      data_library_resources."createdByUserId",
      data_library_resources.visibility,
      data_library_resources."resourceType"
    from ${resourceQuery} as data_library_resources
    order by ${buildDataLibraryOrderBy(queryParams.sort, queryParams.order)}
    limit ${size}
    offset ${offset}
  `)

  return {
    pageCount,
    totalCount,
    data: recordsResult.rows,
  }
}
