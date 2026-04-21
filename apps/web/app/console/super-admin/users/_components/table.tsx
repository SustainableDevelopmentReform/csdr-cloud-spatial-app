import { Badge } from '@repo/ui/components/ui/badge'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import Link from '~/components/link'
import Table from '~/components/table/table'
import { USERS_BASE_PATH } from '~/lib/paths'
import {
  formatGlobalUserRole,
  globalUserRoleSchema,
} from '~/utils/access-control'
import { AdminUser } from '../_hooks'

interface UsersTableProps {
  data: AdminUser[]
}

const columnHelper = createColumnHelper<AdminUser>()

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
    header: () => <span>Name</span>,
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.accessor('email', {
    header: () => <span>Email</span>,
    cell: (info) => info.getValue(),
    minSize: 160,
  }),
  columnHelper.accessor('role', {
    header: () => <span>Role</span>,
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
    header: () => <span>Date added</span>,
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

const UsersTable: React.FC<UsersTableProps> = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return <Table table={table} />
}

export default UsersTable
