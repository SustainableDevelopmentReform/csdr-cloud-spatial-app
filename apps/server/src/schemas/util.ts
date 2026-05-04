import {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from 'drizzle-orm'
import * as schema from './db'

type TableSchema = ExtractTablesWithRelations<typeof schema>

export type QueryForTable<
  TableName extends keyof TableSchema,
  TRelationType extends 'one' | 'many' = 'one' | 'many',
> = DBQueryConfig<TRelationType, boolean, TableSchema, TableSchema[TableName]>

export type InferQueryModel<
  TableName extends keyof TableSchema,
  QBConfig extends QueryForTable<TableName>,
> = BuildQueryResult<TableSchema, TableSchema[TableName], QBConfig>

export const idColumns = {
  id: true,
  name: true,
} as const

export const idColumnsWithMainRunId = {
  id: true,
  name: true,
  mainRunId: true,
} as const

export const baseColumns = {
  id: true,
  name: true,
  description: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const

export const aclColumns = {
  organizationId: true,
  createdByUserId: true,
  visibility: true,
} as const

export const baseAclColumns = {
  ...baseColumns,
  ...aclColumns,
} as const

export const baseRunColumns = {
  ...baseColumns,
  imageCode: true,
  imageTag: true,
  provenanceJson: true,
  provenanceUrl: true,
  dataUrl: true,
  dataType: true,
  dataSize: true,
  dataEtag: true,
  workflowDag: true,
  workflowDagSimple: true,
} as const

export const createPayload = <T extends { name?: string; id?: string }>(
  data: T,
) => ({
  ...data,
  name: data.name ?? crypto.randomUUID(),
  id: data.id || crypto.randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const createOwnedPayload = <
  T extends {
    id?: string
    name?: string
    organizationId: string
    createdByUserId: string
    visibility?: 'private' | 'public' | 'global'
  },
>(
  data: T,
) => ({
  ...createPayload(data),
  visibility: data.visibility ?? 'private',
})

export const updatePayload = <T extends object>(data: T) => ({
  ...data,
  updatedAt: new Date(),
})
