import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import { Button } from '@repo/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import { UseMutationResult } from '@tanstack/react-query'
import {
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Ellipsis } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Table from '~/components/table'

export interface BaseItem {
  name?: string | null
  id: string
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

interface BaseActionProps<T extends BaseItem> {
  title: string
  itemLink?: (item: T) => string
  deleteItem?: UseMutationResult<T, Error, T>
}

const Action = <T extends BaseItem>({
  data,
  deleteItem,
  title,
  itemLink,
}: {
  data: T
} & BaseActionProps<T>) => {
  const [modalState, setModalState] = useState<'idle' | 'delete'>('idle')

  const router = useRouter()

  return (
    <>
      <AlertDialog
        open={modalState === 'delete'}
        onOpenChange={(open) =>
          open ? setModalState('delete') : setModalState('idle')
        }
      >
        <AlertDialogContent className="w-full max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl mb-4">
              Delete {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-800">
              You&apos;re about to delete the {data.name} {title}.
              <br />
              <br />
              This action can&apos;t be reversed
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteItem?.mutateAsync(data, {
                  onSuccess: () => {
                    setModalState('idle')
                  },
                })
              }}
            >
              {deleteItem?.isPending ? 'Loading...' : `Delete ${title}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          {itemLink && (
            <DropdownMenuItem
              onSelect={() => {
                router.push(itemLink(data))
              }}
            >
              View details
            </DropdownMenuItem>
          )}
          {deleteItem && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setModalState('delete')}
                className="text-red-500"
              >
                Delete {title}
              </DropdownMenuItem>
            </>
          )}
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
  T extends {
    name?: string | null
    id: string
    description?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  },
>({
  data,
  baseColumns,
  extraColumns,
  title,
  deleteItem,
  itemLink,
}: BaseCrudTableProps<T>) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<T>()

    return [
      baseColumns.includes('name') &&
        columnHelper.accessor((row) => row.name, {
          id: 'name',
          header: () => <span>{title}</span>,
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
            deleteItem={deleteItem}
            itemLink={itemLink}
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
