'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, tableFromIPC } from 'apache-arrow'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { useMemo, useState } from 'react'
import { Input } from '@repo/ui/components/ui/input'
import { Button } from '@repo/ui/components/ui/button'
import { SearchIcon } from 'lucide-react'

function s3UrlToHttps(s3Url: string): string {
  if (!s3Url.startsWith('s3://')) return s3Url
  const withoutPrefix = s3Url.replace('s3://', '')
  const [bucket, ...pathParts] = withoutPrefix.split('/')
  return `https://${bucket}.s3.amazonaws.com/${pathParts.join('/')}`
}

const PAGE_SIZE = 100

export function DatasetExploreTable({
  dataUrl,
  dataType,
}: {
  dataUrl: string
  dataType: string
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const {
    data: arrowTable,
    isLoading,
    error,
  } = useQuery<Table | null>({
    queryKey: ['parquet-arrow-table', dataUrl],
    queryFn: async () => {
      const url = s3UrlToHttps(dataUrl)
      await initParquetWasm()
      const resp = await fetch(url)
      const arrayBuffer = await resp.arrayBuffer()
      const wasmTable = readParquet(new Uint8Array(arrayBuffer))
      return tableFromIPC(wasmTable.intoIPCStream())
    },
    enabled:
      !!dataUrl &&
      (dataType === 'stac-geoparquet' || dataType === 'geoparquet'),
  })

  const columns = useMemo(() => {
    if (!arrowTable) return []
    return arrowTable.schema.fields.map((f) => f.name)
  }, [arrowTable])

  // Exclude large geometry columns from display
  const displayColumns = useMemo(
    () => columns.filter((c) => c !== 'geometry' && c !== 'geom'),
    [columns],
  )

  const rows = useMemo(() => {
    if (!arrowTable) return []
    const all: Record<string, unknown>[] = []
    for (let i = 0; i < arrowTable.numRows; i++) {
      const row: Record<string, unknown> = {}
      for (const col of displayColumns) {
        const vec = arrowTable.getChild(col)
        row[col] = vec?.get(i)
      }
      all.push(row)
    }
    return all
  }, [arrowTable, displayColumns])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) =>
      displayColumns.some((col) => {
        const v = row[col]
        return v != null && String(v).toLowerCase().includes(q)
      }),
    )
  }, [rows, search, displayColumns])

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE)
  const paginatedRows = filteredRows.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  )

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading parquet data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load parquet data.
      </div>
    )
  }

  if (!arrowTable || arrowTable.numRows === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No data available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rows…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredRows.length.toLocaleString()} rows
        </span>
      </div>

      <div className="rounded-md border overflow-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              {displayColumns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, i) => (
              <tr key={page * PAGE_SIZE + i} className="border-b">
                {displayColumns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[300px] truncate px-3 py-2 font-mono text-xs"
                  >
                    {row[col] != null ? String(row[col]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
