import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import Link from '~/components/link'
import Table from '../../../../components/table'
import { User } from '../../../../utils/authClient'

interface UsersTableProps {
  data: Partial<User>[]
}

const columnHelper = createColumnHelper<Partial<User>>()

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
  columnHelper.accessor('id', {
    id: 'action',
    header: () => <span></span>,
    cell: (info) => (
      <Link
        href={`/console/users/${info.getValue()}`}
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
