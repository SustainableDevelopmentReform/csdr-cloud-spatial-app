import { DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm'
import * as schema from './index'

type TableSchema = ExtractTablesWithRelations<typeof schema>

export type QueryForTable<
  TableName extends keyof TableSchema,
  TRelationType extends 'one' | 'many' = 'one' | 'many',
> = DBQueryConfig<TRelationType, boolean, TableSchema, TableSchema[TableName]>

export const baseColumns = {
  id: true,
  name: true,
  description: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
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
} as const
