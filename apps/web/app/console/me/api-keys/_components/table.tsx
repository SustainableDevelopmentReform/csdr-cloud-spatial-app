import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog'
import { Button } from '@repo/ui/components/ui/button'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import Table from '../../../../../components/table'
import { ApiKey, useDeleteApiKey } from '../../_hooks'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'

interface UsersTableProps {
  data: ApiKey[]
}

const columnHelper = createColumnHelper<ApiKey>()

const columns = [
  columnHelper.accessor('name', {
    header: () => <span>Name</span>,
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.accessor('enabled', {
    header: () => <span>Enabled</span>,
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.accessor('createdAt', {
    header: () => <span>Date added</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor('expiresAt', {
    header: () => <span>Expires at</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    minSize: 160,
  }),
  columnHelper.display({
    id: 'action',
    header: () => <span></span>,
    cell: (info) => {
      const deleteApiKey = useDeleteApiKey(info.row.original.id)
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete API Key</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this
                API key.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteApiKey.mutate()}>
                {deleteApiKey.isPending ? (
                  <LoadingIcon>Deleting...</LoadingIcon>
                ) : (
                  'Continue'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    },
    size: 80,
  }),
]

const UsersTable: React.FC<UsersTableProps> = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return <Table table={table} />
}

export default UsersTable
