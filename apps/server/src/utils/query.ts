import { z } from '@hono/zod-openapi'
import { baseQuerySchema } from '@repo/schemas/crud'
import {
  AnyColumn,
  SQL,
  ValueOrArray,
  and,
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
  baseWhere?: SQL
}

type ParseQueryResult = {
  meta: {
    totalCount: number
    pageCount: number
  }
  query: {
    limit?: number
    offset?: number
    where?: SQL
    orderBy: ValueOrArray<AnyColumn | SQL>
  }
}

export const normalizeFilterValues = (
  value: string | string[] | undefined,
): string[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const parseQuery = async <
  Table extends PgTable,
  Params extends Omit<z.output<typeof baseQuerySchema>, 'sort'> & {
    sort?: TableColumnKeys<Table>
  },
>(
  table: Table,
  params: Params,
  options: QueryOptions<Table>,
): Promise<ParseQueryResult> => {
  const page = params.page && params.page > 0 ? params.page : 1
  const size = params.size && params.size > 0 ? params.size : 10
  const limit = size
  const offset = (page - 1) * size

  const searchValue = params.search?.trim()
  let searchWhere: SQL | undefined

  if (searchValue && options.searchableColumns?.length) {
    const clauses = options.searchableColumns.map((column) =>
      ilike(column, `%${searchValue}%`),
    )
    searchWhere = clauses.length === 1 ? clauses[0] : or(...clauses)
  }

  const where = and(options.baseWhere, searchWhere)

  const countQuery = db
    .select({ totalCount: count() })
    // TODO: figure out how to type this
    .from(table as PgTable)

  const [{ totalCount } = { totalCount: 0 }] = where
    ? await countQuery.where(where)
    : await countQuery

  const total = Number(totalCount ?? 0)
  const pageCount = size > 0 ? Math.ceil(total / size) : 0

  let orderBy: ValueOrArray<AnyColumn | SQL> = options.defaultOrderBy

  if (params.sort && params.sort in table) {
    // TODO: figure out how to type this
    const column = table[params.sort as keyof typeof table] as
      | TableColumn<Table>
      | undefined
    if (column) {
      const direction = params.order ?? 'desc'
      orderBy = direction === 'asc' ? asc(column) : desc(column)
    }
  }

  return {
    meta: { totalCount: total, pageCount },
    query: { limit, offset, where, orderBy },
  }
}
