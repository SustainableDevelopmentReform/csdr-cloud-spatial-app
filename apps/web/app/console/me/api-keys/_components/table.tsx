import { Badge } from '@repo/ui/components/ui/badge'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import { DeleteAlertDialog } from '../../../../../components/form/delete-alert-dialog'
import Table from '../../../../../components/table/table'
import { ApiKey, useDeleteApiKey } from '../../_hooks'

interface ApiKeysTableProps {
  data: ApiKey[]
}

const columnHelper = createColumnHelper<ApiKey>()

const DeleteApiKeyButton = ({ apiKeyId }: { apiKeyId: string }) => {
  const deleteApiKey = useDeleteApiKey(apiKeyId)

  return (
    <DeleteAlertDialog
      buttonVariant="destructive"
      buttonTitle="Delete API Key"
      confirmDialog={{
        title: 'Delete API Key',
        description:
          'Are you absolutely sure you want to delete this API key? This action cannot be undone.',
        buttonCancelTitle: 'Cancel',
      }}
      mutation={deleteApiKey}
    />
  )
}

const columns = [
  columnHelper.accessor('name', {
    header: () => <span>Name</span>,
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.display({
    id: 'enabled',
    header: () => <span>Enabled</span>,
    cell: ({ row }) => {
      const value = row.original.enabled

      if (value) {
        return <Badge variant="default">Enabled</Badge>
      } else {
        return <Badge variant="destructive">Disabled</Badge>
      }
    },
    size: 120,
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
      return <DeleteApiKeyButton apiKeyId={info.row.original.id} />
    },
    size: 80,
  }),
]

const ApiKeysTable: React.FC<ApiKeysTableProps> = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return <Table table={table} />
}

export default ApiKeysTable
