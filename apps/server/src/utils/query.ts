import { z } from '@hono/zod-openapi'
import { baseQuerySchema } from '@repo/schemas/crud'
import {
  AnyColumn,
  SQL,
  ValueOrArray,
  asc,
  count,
  desc,
  ilike,
  or,
} from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { db } from '../lib/db'

type TableColumnKeys<Table extends PgTable> = Extract<
  {
    [Key in keyof Table]: Table[Key] extends AnyColumn ? Key : never
  }[keyof Table],
  string
>

type TableColumn<Table extends PgTable> = Table[TableColumnKeys<Table>] &
  AnyColumn

type QueryOptions<Table extends PgTable> = {
  defaultOrderBy: ValueOrArray<AnyColumn | SQL>
  searchableColumns?: Array<TableColumn<Table>>
}

type ParseQueryResult = {
  limit?: number
  offset?: number
  totalCount: number
  pageCount: number
  where?: SQL
  orderBy: ValueOrArray<AnyColumn | SQL>
}

export const parseQuery = async <
  Table extends PgTable,
  Params extends z.input<typeof baseQuerySchema> & {
    sort?: TableColumnKeys<Table>
  },
>(
  table: Table,
  params: Params,
  options: QueryOptions<Table>,
): Promise<ParseQueryResult> => {
  const parsed = baseQuerySchema.parse(params)

  const usePagination = !parsed.disablePagination

  const page = parsed.page && parsed.page > 0 ? parsed.page : 1
  const size = parsed.size && parsed.size > 0 ? parsed.size : 10
  const limit = size
  const offset = (page - 1) * size

  const [{ totalCount } = { totalCount: 0 }] = await db
    .select({ totalCount: count() })
    // TODO: figure out how to type this
    .from(table as PgTable)

  const total = Number(totalCount ?? 0)
  const pageCount = size > 0 ? Math.ceil(total / size) : 0

  const searchValue = parsed.search?.trim()
  let where: SQL | undefined

  if (searchValue && options.searchableColumns?.length) {
    const clauses = options.searchableColumns.map((column) =>
      ilike(column, `%${searchValue}%`),
    )
    where = clauses.length === 1 ? clauses[0] : or(...clauses)
  }

  let orderBy: ValueOrArray<AnyColumn | SQL> = options.defaultOrderBy

  if (parsed.sort && parsed.sort in table) {
    // TODO: figure out how to type this
    const column = table[parsed.sort as keyof typeof table] as
      | TableColumn<Table>
      | undefined
    if (column) {
      const direction = parsed.order ?? 'desc'
      orderBy = direction === 'asc' ? asc(column) : desc(column)
    }
  }

  return {
    limit: usePagination ? limit : undefined,
    offset: usePagination ? offset : undefined,
    totalCount: total,
    pageCount: usePagination ? pageCount : 1,
    where,
    orderBy,
  }
}
