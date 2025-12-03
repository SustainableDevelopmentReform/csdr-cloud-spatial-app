import { baseQuerySchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import {
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import z from 'zod'
import Table from '~/components/table/table'
import { formatDateTime } from '@repo/ui/lib/date'

export interface BaseItem {
  name: string
  id: string
  description?: string | null
  createdAt: string
  updatedAt: string
  metadata?: any
}

interface BaseActionProps<T extends BaseItem> {
  title: string
  itemLink?: (item: T) => string
  itemButton?: (item: T) => React.ReactNode | React.ReactNode[]
}

const Action = <T extends BaseItem>({
  data,
  itemLink,
  itemButton,
}: {
  data: T
} & BaseActionProps<T>) => {
  const router = useRouter()

  if (!itemLink || itemButton) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-7 w-7 p-0 focus-visible:ring-0 focus-visible:ring-transparent"
            variant="ghost"
          >
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuItem
            onSelect={() => {
              if (itemLink) {
                router.push(itemLink(data))
              }
            }}
          >
            View details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

interface BaseCrudTableProps<T extends BaseItem> extends BaseActionProps<T> {
  data: T[]
  baseColumns: readonly (keyof T)[]
  extraColumns?: ColumnDef<T>[]
  query?: Pick<z.input<typeof baseQuerySchema>, 'sort' | 'order'>
  onSortChange?: (
    query: Pick<z.input<typeof baseQuerySchema>, 'sort' | 'order'>,
  ) => void
}

const SortButton = ({
  children,
  order,
  onClick,
}: {
  children: React.ReactNode
  order: 'asc' | 'desc' | false | undefined
  onClick: () => void
}) => {
  return (
    <Button variant="ghost" className="font-normal" onClick={onClick}>
      {children}
      {order === 'asc' ? (
        <ArrowUp />
      ) : order === 'desc' ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown className="opacity-40" />
      )}
    </Button>
  )
}

const BaseCrudTable = <
  T extends BaseItem & {
    itemButton?: (item: T) => React.ReactNode
  },
>({
  data,
  query,
  baseColumns,
  extraColumns,
  title,
  itemLink,
  itemButton,
  onSortChange,
}: BaseCrudTableProps<T>) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<T>()

    return [
      itemButton &&
        columnHelper.accessor((row) => row, {
          id: 'itemButton',
          header: ({ table }) => (
            <SortButton
              order={query?.sort === 'name' && query?.order}
              onClick={() =>
                table.setSorting([
                  {
                    id: 'name',
                    desc:
                      query?.sort === 'name' && query?.order === 'asc'
                        ? true
                        : false,
                  },
                ])
              }
            >
              {title}
            </SortButton>
          ),
          cell: (info) => itemButton(info.row.original),
          size: 120,
        }),
      baseColumns.includes('id') &&
        columnHelper.accessor((row) => row.id, {
          id: 'id',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              {title} ID
            </SortButton>
          ),
          cell: (info) => (
            <span className="text-gray-500">
              <code>{info.getValue()}</code>
            </span>
          ),
          size: 120,
        }),
      baseColumns.includes('name') &&
        columnHelper.accessor((row) => row.name, {
          id: 'name',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              {title} Name
            </SortButton>
          ),
          cell: (info) => info.getValue(),
          minSize: 120,
        }),
      baseColumns.includes('description') &&
        columnHelper.accessor((row) => row.description, {
          id: 'description',
          header: () => <span>Description</span>,
          cell: (info) => info.getValue(),
          minSize: 120,
        }),

      baseColumns.includes('createdAt') &&
        columnHelper.accessor((row) => row.createdAt, {
          id: 'createdAt',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              Date added
            </SortButton>
          ),
          cell: (info) => {
            const value = info.getValue()
            if (!value) return null
            return formatDateTime(value)
          },
          size: 120,
        }),

      baseColumns.includes('updatedAt') &&
        columnHelper.accessor((row) => row.updatedAt, {
          id: 'updatedAt',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              Date updated
            </SortButton>
          ),
          cell: (info) => {
            const value = info.getValue()
            if (!value) return null
            return formatDateTime(value)
          },
          size: 120,
        }),

      ...(extraColumns || []),

      columnHelper.display({
        id: 'action',
        header: () => <span></span>,
        cell: (info) => (
          <Action
            data={info.row.original}
            title={title}
            itemLink={itemLink}
            itemButton={itemButton}
          />
        ),
        size: 80,
      }),
    ].filter(Boolean) as ColumnDef<T>[]
  }, [
    baseColumns,
    extraColumns,
    itemButton,
    itemLink,
    query?.order,
    query?.sort,
    title,
  ])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, //use pre-sorted row model instead of sorted row model
    state: {
      sorting: query?.sort
        ? [{ id: query.sort, desc: query.order === 'desc' }]
        : [],
    },
    enableMultiSort: false,
    onSortingChange: (sorting) => {
      const sortingState = Array.isArray(sorting) ? sorting : sorting([])
      onSortChange?.({
        // TODO add proper type for sort
        sort: sortingState[0]?.id as z.input<typeof baseQuerySchema>['sort'],
        order: sortingState[0]?.desc ? 'desc' : 'asc',
      })
    },
  })

  return <Table table={table} />
}

export default BaseCrudTable
