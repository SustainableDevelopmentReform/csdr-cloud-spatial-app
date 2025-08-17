import { DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm'
import * as schema from './index'

type TableSchema = ExtractTablesWithRelations<typeof schema>

export type QueryForTable<TableName extends keyof TableSchema> = DBQueryConfig<
  'one' | 'many',
  boolean,
  TableSchema,
  TableSchema[TableName]
>
