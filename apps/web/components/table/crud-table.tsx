import { baseQuerySchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pen,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { useMemo } from 'react'
import z from 'zod'
import Table from '~/components/table/table'
import { formatDateTime } from '@repo/ui/lib/date'
import Link from '~/components/link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import type { ResourceVisibility } from '~/utils/access-control'

export interface BaseItem {
  name: string
  id: string
  description?: string | null
  createdAt: string
  updatedAt: string
  visibility?: ResourceVisibility | null
  metadata?: unknown
}

interface BaseActionProps<T extends BaseItem> {
  title: string
  itemLink?: (item: T) => string
  editLink?: (item: T) => string
  itemActionLabel?: string
  showEditAction?: boolean
  canModifyItem?: (item: T) => boolean
  deleteAction?: (item: T) => React.ReactNode
}

const actionButtonClassName = 'h-8 px-3 text-xs'

const Action = <T extends BaseItem>({
  data,
  itemLink,
  editLink,
  itemActionLabel = 'View',
  showEditAction = true,
  canModifyItem,
  deleteAction,
}: {
  data: T
} & BaseActionProps<T>) => {
  const canModify = canModifyItem?.(data) ?? false
  const resolvedItemLink = itemLink?.(data)
  const resolvedEditLink = editLink?.(data) ?? resolvedItemLink
  const resolvedDeleteAction = canModify ? deleteAction?.(data) : null
  const shouldShowEditAction =
    showEditAction && canModify && Boolean(resolvedEditLink)

  if (!resolvedItemLink && !shouldShowEditAction && !resolvedDeleteAction) {
    return null
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {resolvedItemLink ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className={actionButtonClassName}
        >
          <Link href={resolvedItemLink}>
            {itemActionLabel}
            <SquareArrowOutUpRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      {shouldShowEditAction && resolvedEditLink ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className={actionButtonClassName}
        >
          <Link href={resolvedEditLink}>
            <Pen className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      ) : null}
      {resolvedDeleteAction}
    </div>
  )
}

type BaseCrudTableQuery = {
  sort?: string
  order?: z.input<typeof baseQuerySchema>['order']
}

type BaseCrudTableSortChange<Q extends BaseCrudTableQuery> = {
  sort?: Q['sort']
  order?: Q['order']
}

interface BaseCrudTableProps<
  T extends BaseItem,
  Q extends BaseCrudTableQuery = BaseCrudTableQuery,
> extends BaseActionProps<T> {
  data: T[]
  isLoading?: boolean
  baseColumns: readonly (keyof T)[]
  extraColumns?: ColumnDef<T>[]
  query?: Q
  sortOptions: readonly NonNullable<Q['sort']>[]
  onSortChange?: (query: BaseCrudTableSortChange<Q>) => void
}

export const SortButton = ({
  children,
  order,
  onClick,
}: {
  children: React.ReactNode
  order: 'asc' | 'desc' | false | undefined
  onClick: () => void
}) => {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
    >
      {children}
      {order === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : order === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-40" />
      )}
    </button>
  )
}

const resolveSort = <Sort extends string>(
  sort: string | undefined,
  sortOptions: readonly Sort[],
): Sort | undefined => sortOptions.find((sortOption) => sortOption === sort)

const BaseCrudTable = <
  T extends BaseItem,
  Q extends BaseCrudTableQuery = BaseCrudTableQuery,
>({
  data,
  query,
  baseColumns,
  extraColumns,
  title,
  itemLink,
  editLink,
  itemActionLabel,
  showEditAction,
  canModifyItem,
  deleteAction,
  sortOptions,
  isLoading = false,
  onSortChange,
}: BaseCrudTableProps<T, Q>) => {
  const sortingState = query?.sort
    ? [{ id: query.sort, desc: query.order === 'desc' }]
    : []

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const nextColumns: ColumnDef<T>[] = []

    nextColumns.push({
      id: 'name',
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <SortButton
          order={column.getIsSorted()}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
        </SortButton>
      ),
      cell: (info) => (
        <span className="inline-flex max-w-full items-center gap-1.5 font-medium text-foreground">
          <span className="min-w-0 truncate">{info.row.original.name}</span>
          <GlobalVisibilityIndicator
            visibility={info.row.original.visibility}
          />
        </span>
      ),
      minSize: 220,
    })

    if (baseColumns.includes('description')) {
      nextColumns.push({
        id: 'description',
        accessorFn: (row) => row.description,
        header: () => <span>Description</span>,
        cell: (info) => (
          <span className="text-foreground">
            {info.row.original.description}
          </span>
        ),
        size: 252,
      })
    }

    if (extraColumns) {
      nextColumns.push(...extraColumns)
    }

    if (baseColumns.includes('updatedAt')) {
      nextColumns.push({
        id: 'updatedAt',
        accessorFn: (row) => row.updatedAt,
        header: ({ column }) => (
          <SortButton
            order={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Updated
          </SortButton>
        ),
        cell: (info) => {
          const value = info.row.original.updatedAt
          if (!value) return null
          return formatDateTime(value)
        },
        size: 180,
      })
    }

    nextColumns.push({
      id: 'action',
      header: () => <span></span>,
      cell: (info) => (
        <Action
          data={info.row.original}
          title={title}
          itemLink={itemLink}
          editLink={editLink}
          itemActionLabel={itemActionLabel}
          showEditAction={showEditAction}
          canModifyItem={canModifyItem}
          deleteAction={deleteAction}
        />
      ),
      size: 260,
    })

    return nextColumns
  }, [
    baseColumns,
    canModifyItem,
    deleteAction,
    editLink,
    extraColumns,
    itemActionLabel,
    itemLink,
    showEditAction,
    title,
  ])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, //use pre-sorted row model instead of sorted row model
    state: {
      sorting: sortingState,
    },
    enableMultiSort: false,
    onSortingChange: (sorting) => {
      const nextSortingState =
        typeof sorting === 'function' ? sorting(sortingState) : sorting
      const firstSorting = nextSortingState[0]
      const sort = resolveSort(firstSorting?.id, sortOptions)
      onSortChange?.({
        sort,
        order:
          sort && firstSorting
            ? firstSorting.desc
              ? 'desc'
              : 'asc'
            : undefined,
      })
    },
  })

  return <Table table={table} isLoading={isLoading} />
}

export default BaseCrudTable
