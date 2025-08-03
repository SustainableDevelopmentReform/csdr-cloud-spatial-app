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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { InferResponseType } from 'hono/client'
import { Ellipsis } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { sleep } from '~/utils'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import Table from '../../../../components/table'

type Dataset = NonNullable<
  InferResponseType<typeof client.api.v1.dataset.$get, 200>['data']
>['data'][0]

const columnHelper = createColumnHelper<Dataset>()

const columns = [
  columnHelper.accessor('name', {
    header: () => <span>Dataset</span>,
    cell: (info) => info.getValue(),
    minSize: 220,
  }),
  columnHelper.accessor('id', {
    header: () => <span>Dataset ID</span>,
    cell: (info) => (
      <span className="text-gray-500">
        <code>{info.getValue()}</code>
      </span>
    ),
    size: 120,
  }),
  columnHelper.accessor('createdAt', {
    header: () => <span>Date added</span>,
    cell: (info) => dayjs(info.getValue()).format('DD MMM YYYY'),
    size: 120,
  }),

  columnHelper.accessor('updatedAt', {
    header: () => <span>Date updated</span>,
    cell: (info) => dayjs(info.getValue()).format('DD MMM YYYY'),
    size: 120,
  }),

  columnHelper.display({
    id: 'action',
    header: () => <span></span>,
    cell: (info) => <Action data={info.row.original} />,
    size: 80,
  }),
]

const Action: React.FC<{ data: Dataset }> = ({ data }) => {
  const [modalState, setModalState] = useState<'idle' | 'delete'>('idle')

  const router = useRouter()
  const queryClient = useQueryClient()

  const deleteDataset = useMutation({
    mutationFn: async () => {
      const res = client.api.v1.dataset[':id'].$delete({
        param: {
          id: data.id.toString(),
        },
      })

      await unwrapResponse(res)
    },
    onSuccess: async () => {
      setModalState('idle')
      await sleep(100)
      queryClient.invalidateQueries({ queryKey: [QueryKey.Datasets] })
    },
  })

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
              Delete Dataset
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-800">
              You&apos;re about to delete the {data.name} Dataset.
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
                deleteDataset.mutate()
              }}
            >
              {deleteDataset.isPending ? 'Loading...' : 'Delete Dataset'}
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
          <DropdownMenuItem
            onSelect={() => {
              router.push(`/console/datasets/${data.id}`)
            }}
          >
            View details
          </DropdownMenuItem>
          {
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setModalState('delete')}
                className="text-red-500"
              >
                Delete Dataset
              </DropdownMenuItem>
            </>
          }
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

interface DatasetTableProps {
  data: Dataset[]
}

const DatasetTable: React.FC<DatasetTableProps> = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return <Table table={table} />
}

export default DatasetTable
