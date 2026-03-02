import { flexRender, type Table as TableType } from '@tanstack/react-table'
import React from 'react'

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
  const totalWidth = table.getTotalSize()

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto">
      <table
        className="w-full min-w-full border-collapse"
        style={totalWidth > 0 ? { minWidth: `${totalWidth}px` } : undefined}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className="text-left py-3 px-2 font-normal border-b border-gray-200 text-gray-500"
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
                colSpan={table.getAllColumns().length}
                className="text-center py-4"
              >
                {isLoading ? loadingStateLabel : emptyStateLabel}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  className="py-3 px-2 text-sm border-b border-gray-200"
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
