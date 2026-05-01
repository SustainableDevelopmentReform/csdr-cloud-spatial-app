import { flexRender, type Table as TableType } from '@tanstack/react-table'
import React from 'react'
import { cn } from '@repo/ui/lib/utils'

interface Props<T> {
  table: TableType<T>
  isLoading?: boolean
  emptyStateLabel?: string
  loadingStateLabel?: string
}

const Table = <T,>({
  table,
  isLoading = false,
  emptyStateLabel = 'No items found',
  loadingStateLabel = 'Loading...',
}: Props<T>) => {
  const rows = table.getRowModel().rows
  const visibleColumnCount = table.getAllColumns().length

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className={cn(
                    'h-10 min-w-20 border-b border-border px-2 text-left align-middle text-sm font-medium leading-5 text-muted-foreground',
                    header.column.id === 'action' && 'text-right',
                  )}
                  key={header.id}
                  style={{ width: header.getSize() }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={visibleColumnCount}
                className="h-20 border-b border-border px-2 text-center text-sm text-muted-foreground"
              >
                {isLoading ? loadingStateLabel : emptyStateLabel}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  className={cn(
                    'h-[52px] min-w-20 border-b border-border px-2 py-2 align-middle text-sm leading-5 text-foreground',
                    cell.column.id === 'action' && 'text-right',
                  )}
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                >
                  <div
                    className={cn(
                      'min-w-0 truncate',
                      cell.column.id === 'action' &&
                        'flex justify-end overflow-visible',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
