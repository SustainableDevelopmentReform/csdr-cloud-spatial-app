import { DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm'
import * as schema from './index'

type TableSchema = ExtractTablesWithRelations<typeof schema>

export type QueryForTable<
  TableName extends keyof TableSchema,
  TRelationType extends 'one' | 'many' = 'one' | 'many',
> = DBQueryConfig<TRelationType, boolean, TableSchema, TableSchema[TableName]>
