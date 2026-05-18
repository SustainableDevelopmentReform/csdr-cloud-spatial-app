import { Badge } from '@repo/ui/components/ui/badge'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import Link from '~/components/link'
import { SortButton } from '~/components/table/crud-table'
import {
  createManualSortingChangeHandler,
  createSortResolver,
  getManualSortingState,
} from '~/components/table/sorting'
import Table from '~/components/table/table'
import { USERS_BASE_PATH } from '~/lib/paths'
import {
  formatGlobalUserRole,
  globalUserRoleSchema,
} from '~/utils/access-control'
import { AdminUser, AdminUserSort, AdminUserSortOrder } from '../_hooks'

interface UsersTableProps {
  data: AdminUser[]
  sort?: AdminUserSort
  order?: AdminUserSortOrder
  onSortChange?: (sort?: AdminUserSort, order?: AdminUserSortOrder) => void
}

const columnHelper = createColumnHelper<AdminUser>()
const userSortOptions: readonly AdminUserSort[] = [
  'name',
  'email',
  'role',
  'createdAt',
]

const StatusBadge = ({
  status,
  enabledLabel,
  disabledLabel,
}: {
  status: boolean
  enabledLabel: string
  disabledLabel: string
}) => (
  <Badge variant={status ? 'default' : 'destructive'}>
    {status ? enabledLabel : disabledLabel}
  </Badge>
)

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
  columnHelper.accessor('email', {
    header: ({ column }) => (
      <SortButton
        order={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Email
      </SortButton>
    ),
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.accessor('role', {
    header: ({ column }) => (
      <SortButton
        order={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Role
      </SortButton>
    ),
    cell: (info) => {
      const parsedRole = globalUserRoleSchema.safeParse(info.getValue())
      return formatGlobalUserRole(parsedRole.success ? parsedRole.data : 'user')
    },
    minSize: 160,
  }),
  columnHelper.accessor('emailVerified', {
    header: () => <span>Email verified</span>,
    cell: (info) => (
      <StatusBadge
        status={info.getValue()}
        enabledLabel="Verified"
        disabledLabel="Unverified"
      />
    ),
    size: 140,
  }),
  columnHelper.accessor('twoFactorEnabled', {
    header: () => <span>2FA</span>,
    cell: (info) => (
      <StatusBadge
        status={info.getValue()}
        enabledLabel="Enabled"
        disabledLabel="Disabled"
      />
    ),
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
  columnHelper.accessor('id', {
    id: 'action',
    header: () => <span></span>,
    cell: (info) => (
      <Link
        href={`${USERS_BASE_PATH}/${info.getValue()}`}
        className="hover:underline"
      >
        View details
      </Link>
    ),
    size: 80,
  }),
]

const UsersTable: React.FC<UsersTableProps> = ({
  data,
  sort,
  order,
  onSortChange,
}) => {
  const sortingState = getManualSortingState(sort, order)
  const resolveSort = createSortResolver(userSortOptions)
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

export default UsersTable
