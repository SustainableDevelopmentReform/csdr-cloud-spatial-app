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
import { Ellipsis } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import Table from '~/components/table'

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
}

const BaseCrudTable = <
  T extends BaseItem & {
    itemButton?: (item: T) => React.ReactNode
  },
>({
  data,
  baseColumns,
  extraColumns,
  title,
  itemLink,
  itemButton,
}: BaseCrudTableProps<T>) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<T>()

    return [
      itemButton &&
        columnHelper.accessor((row) => row, {
          id: 'itemButton',
          header: () => <span>{title}</span>,
          cell: (info) => itemButton(info.row.original),
          size: 120,
        }),
      baseColumns.includes('id') &&
        columnHelper.accessor((row) => row.id, {
          id: 'id',
          header: () => <span>{title} ID</span>,
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
          header: () => <span>{title} Name</span>,
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
          header: () => <span>Date added</span>,
          cell: (info) => {
            const value = info.getValue()
            if (!value) return null
            return new Date(value).toLocaleDateString()
          },
          size: 120,
        }),

      baseColumns.includes('updatedAt') &&
        columnHelper.accessor((row) => row.updatedAt, {
          id: 'updatedAt',
          header: () => <span>Date updated</span>,
          cell: (info) => {
            const value = info.getValue()
            if (!value) return null
            return new Date(value).toLocaleDateString()
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
  }, [baseColumns, extraColumns, title])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return <Table table={table} />
}

export default BaseCrudTable
