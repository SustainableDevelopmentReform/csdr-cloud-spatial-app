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
import { buildExplorerReadScope } from '~/lib/authorization'
import type { AuthType } from '~/lib/auth'
import { db } from '~/lib/db'
import {
  buildGeometryIntersectsFilter,
  getBoundsFilterEnvelope,
} from '~/lib/geographicBounds'
import {
  dataset,
  datasetRun,
  geometries,
  geometryOutput,
  product,
  productOutputSummary,
} from '~/schemas/db'
import { baseAclColumns } from '~/schemas/util'

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

type BaseResourceRecord = Omit<DataLibraryRecord, 'resourceType'>

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

const toDataLibraryRecord = (
  record: BaseResourceRecord,
  resourceType: DataLibraryResourceType,
): DataLibraryRecord => ({
  ...record,
  resourceType,
})

const compareDataLibraryRecords = (
  a: DataLibraryRecord,
  b: DataLibraryRecord,
  sort: DataLibrarySort | undefined,
  order: DataLibraryQuery['order'],
): number => {
  const direction = order === 'asc' ? 1 : -1
  const sortKey = sort ?? 'updatedAt'
  let comparison = 0

  switch (sortKey) {
    case 'name':
      comparison = a.name.localeCompare(b.name)
      break
    case 'createdAt':
      comparison = a.createdAt.getTime() - b.createdAt.getTime()
      break
    case 'updatedAt':
      comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
      break
  }

  if (comparison !== 0) {
    return comparison * direction
  }

  const typeComparison = a.resourceType.localeCompare(b.resourceType)

  if (typeComparison !== 0) {
    return typeComparison
  }

  return a.id.localeCompare(b.id)
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

  const [datasetRecords, boundaryRecords, productRecords] = await Promise.all([
    includesResourceType(resourceTypes, 'dataset')
      ? db.query.dataset.findMany({
          columns: baseAclColumns,
          where: and(
            buildExplorerReadScope(
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
        })
      : Promise.resolve([]),
    includesResourceType(resourceTypes, 'boundary')
      ? db.query.geometries.findMany({
          columns: baseAclColumns,
          where: and(
            buildExplorerReadScope(
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
        })
      : Promise.resolve([]),
    includesResourceType(resourceTypes, 'product')
      ? db.query.product.findMany({
          columns: baseAclColumns,
          where: and(
            buildExplorerReadScope(
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
        })
      : Promise.resolve([]),
  ])

  const records = [
    ...datasetRecords.map((record) => toDataLibraryRecord(record, 'dataset')),
    ...boundaryRecords.map((record) => toDataLibraryRecord(record, 'boundary')),
    ...productRecords.map((record) => toDataLibraryRecord(record, 'product')),
  ].sort((a, b) =>
    compareDataLibraryRecords(a, b, queryParams.sort, queryParams.order),
  )

  const totalCount = records.length
  const pageCount = size > 0 ? Math.ceil(totalCount / size) : 0
  const startIndex = (page - 1) * size

  return {
    pageCount,
    totalCount,
    data: records.slice(startIndex, startIndex + size),
  }
}
