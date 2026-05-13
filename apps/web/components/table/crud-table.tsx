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
import { ResourceVisibilityIcon } from '~/app/console/_components/resource-visibility-icon'
import type { ResourceVisibility } from '~/utils/access-control'

interface BaseItem {
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

const actionButtonClassName = 'h-8 px-2 text-xs'

const resourceVisibilityLabels: Record<ResourceVisibility, string> = {
  global: 'Global',
  private: 'Private',
  public: 'Public',
}

const ResourceNameVisibilityIndicator = ({
  visibility,
}: {
  visibility?: ResourceVisibility | null
}) => {
  if (!visibility) {
    return null
  }

  const label = `${resourceVisibilityLabels[visibility]} resource`

  return (
    <span
      aria-label={label}
      className="inline-flex shrink-0 items-center justify-center text-muted-foreground"
      title={label}
    >
      <ResourceVisibilityIcon visibility={visibility} className="size-3.5" />
    </span>
  )
}

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
    <div className="flex w-max flex-nowrap justify-end gap-2 whitespace-nowrap">
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
  stickyColumnClassName?: string
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

const getActionButtonWidth = ({
  hasIcon,
  label,
}: {
  hasIcon: boolean
  label: string
}) => Math.max(56, label.length * 7 + (hasIcon ? 24 : 0) + 16)

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
  stickyColumnClassName,
  isLoading = false,
  onSortChange,
}: BaseCrudTableProps<T, Q>) => {
  const sortingState = query?.sort
    ? [{ id: query.sort, desc: query.order === 'desc' }]
    : []
  const canModifyAny =
    canModifyItem !== undefined
      ? data.length === 0 || data.some((item) => canModifyItem(item))
      : false
  const hasViewAction = Boolean(itemLink)
  const hasEditAction =
    showEditAction !== false && canModifyAny && Boolean(editLink ?? itemLink)
  const hasDeleteAction = canModifyAny && Boolean(deleteAction)
  const actionButtonWidths = [
    hasViewAction
      ? getActionButtonWidth({
          hasIcon: true,
          label: itemActionLabel ?? 'View',
        })
      : 0,
    hasEditAction
      ? getActionButtonWidth({
          hasIcon: true,
          label: 'Edit',
        })
      : 0,
    hasDeleteAction
      ? getActionButtonWidth({
          hasIcon: true,
          label: 'Delete',
        })
      : 0,
  ].filter((width) => width > 0)
  const actionColumnSize =
    actionButtonWidths.length > 0
      ? actionButtonWidths.reduce((total, width) => total + width, 16) +
        (actionButtonWidths.length - 1) * 8
      : 48

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
          <ResourceNameVisibilityIndicator
            visibility={info.row.original.visibility}
          />
        </span>
      ),
      size: 240,
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
      size: actionColumnSize,
    })

    return nextColumns
  }, [
    baseColumns,
    actionColumnSize,
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

  return (
    <Table
      table={table}
      isLoading={isLoading}
      stickyColumnClassName={stickyColumnClassName}
    />
  )
}

export default BaseCrudTable
