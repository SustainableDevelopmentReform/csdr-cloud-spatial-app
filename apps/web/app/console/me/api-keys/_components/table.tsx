import { Badge } from '@repo/ui/components/ui/badge'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import { DeleteAlertDialog } from '../../../../../components/form/delete-alert-dialog'
import { SortButton } from '../../../../../components/table/crud-table'
import {
  createManualSortingChangeHandler,
  createSortResolver,
  getManualSortingState,
} from '../../../../../components/table/sorting'
import Table from '../../../../../components/table/table'
import {
  ApiKey,
  ApiKeySort,
  ApiKeySortOrder,
  useDeleteApiKey,
} from '../../_hooks'

interface ApiKeysTableProps {
  data: ApiKey[]
  sort?: ApiKeySort
  order?: ApiKeySortOrder
  onSortChange?: (sort?: ApiKeySort, order?: ApiKeySortOrder) => void
}

const columnHelper = createColumnHelper<ApiKey>()
const apiKeySortOptions: readonly ApiKeySort[] = [
  'name',
  'createdAt',
  'expiresAt',
]

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
    header: ({ column }) => (
      <SortButton
        order={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Name
      </SortButton>
    ),
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
    header: ({ column }) => (
      <SortButton
        order={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date added
      </SortButton>
    ),
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor('expiresAt', {
    header: ({ column }) => (
      <SortButton
        order={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Expires at
      </SortButton>
    ),
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

const ApiKeysTable: React.FC<ApiKeysTableProps> = ({
  data,
  sort,
  order,
  onSortChange,
}) => {
  const sortingState = getManualSortingState(sort, order)
  const resolveSort = createSortResolver(apiKeySortOptions)
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: sortingState,
    },
    enableMultiSort: false,
    onSortingChange: createManualSortingChangeHandler({
      sortingState,
      resolveSort,
      onSortChange,
    }),
  })

  return <Table table={table} />
}

export default ApiKeysTable
