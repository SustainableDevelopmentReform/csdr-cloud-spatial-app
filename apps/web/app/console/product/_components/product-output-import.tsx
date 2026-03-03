'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  importProductOutputColumnMappingSchema,
  importProductOutputsSchema,
} from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { CalendarSelect } from '@repo/ui/components/ui/calendar-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import Papa from 'papaparse'
import {
  ChangeEvent,
  DragEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useUnsavedChangesWarning } from '~/hooks/useUnsavedChangesWarning'
import { ImportProductOutputsPayload, useImportProductOutputs } from '../_hooks'
import type { IndicatorListItem } from '../../indicator/_hooks'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
type CsvSummary = {
  columns: string[]
  rowCount: number
  fileName: string
  fileSize: number
  samplesByColumn: Record<string, string[]>
  previewRows: Record<string, string>[]
}

const PREVIEW_ROW_COUNT = 5

const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  )
  const value = size / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const parseCsv = (file: File) =>
  new Promise<Papa.ParseResult<Record<string, unknown>>>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: resolve,
      error: reject,
    })
  })

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

// Note we need to override the indicatorMappings schema (as the server-side schema is a union of the string - to handle JSON parsing - and the array)
const importProductOutputsFormSchema = importProductOutputsSchema.extend({
  indicatorMappings: importProductOutputColumnMappingSchema,
})

type ImportProductOutputsFormValues = z.infer<
  typeof importProductOutputsFormSchema
>
type ColumnMapping = ImportProductOutputsFormValues['indicatorMappings'][number]

const ColumnMappingRow = memo(function ColumnMappingRow({
  column,
  geometryColumn,
  isImporting,
  samples,
  indicatorId,
  timePoint,
  onIndicatorSelect,
  onTimePointChange,
}: {
  column: string
  geometryColumn: string
  isImporting: boolean
  samples: string[] | undefined
  indicatorId: string | null
  timePoint: string | null
  onIndicatorSelect: (
    column: string,
    indicator: IndicatorListItem | null,
  ) => void
  onTimePointChange: (column: string, date: Date | null) => void
}) {
  const handleIndicatorChange = useCallback(
    (option: IndicatorListItem | null | undefined) => {
      onIndicatorSelect(column, option ?? null)
    },
    [column, onIndicatorSelect],
  )

  const handleDateChange = useCallback(
    (event: Date | undefined) => {
      if (event) {
        onTimePointChange(column, event)
      }
    },
    [column, onTimePointChange],
  )

  return (
    <div className="rounded-md border p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <div className="font-medium">{column}</div>
        {column === geometryColumn ? (
          <Badge variant="outline">Geometry column</Badge>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        Samples:{' '}
        {samples?.length
          ? samples.map((sample) => sample || '""').join(', ')
          : '—'}
      </div>
      <IndicatorsSelect
        value={indicatorId}
        onChange={handleIndicatorChange}
        isDisabled={column === geometryColumn || isImporting}
        isClearable
        placeholder={
          column === geometryColumn
            ? 'Geometry column selected above'
            : 'Map to a indicator (optional)'
        }
        creatable
      />
      <div
        className={cn({
          'opacity-50 pointer-events-none': indicatorId === null,
        })}
      >
        <CalendarSelect
          label="Time Point"
          value={timePoint ? new Date(timePoint) : undefined}
          onChange={handleDateChange}
        />
      </div>
    </div>
  )
})

const ProductOutputsImportForm = ({
  productRunId,
  geometriesRunId,
  onCompleted,
  dirtyRef,
}: {
  productRunId?: string
  geometriesRunId?: string
  onCompleted: () => void
  dirtyRef: React.RefObject<boolean>
}) => {
  const defaultValues = useMemo(
    () => ({
      productRunId: productRunId ?? '',
      geometryColumn: '',
      indicatorMappings: [],
    }),
    [productRunId],
  )

  const form = useForm<ImportProductOutputsFormValues>({
    resolver: zodResolver(importProductOutputsFormSchema),
    defaultValues,
  })
  const { append, remove, update, replace } = useFieldArray<
    ImportProductOutputsFormValues,
    'indicatorMappings'
  >({
    control: form.control,
    name: 'indicatorMappings',
  })

  useEffect(() => {
    if (productRunId) {
      form.setValue('productRunId', productRunId)
    }
  }, [form, productRunId])

  const importProductOutputs = useImportProductOutputs()
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useUnsavedChangesWarning(selectedFile !== null)

  useEffect(() => {
    dirtyRef.current = selectedFile !== null
  }, [selectedFile, dirtyRef])

  const geometryColumn = form.watch('geometryColumn')
  const indicatorMappings = form.watch('indicatorMappings')

  const resetCsvState = useCallback(() => {
    setCsvSummary(null)
    setRows([])
    setSelectedFile(null)
    setDropError(null)
    form.setValue('csvFile', undefined as unknown as File)
    form.setValue('geometryColumn', '')
    replace([])
  }, [form, replace])

  const processFile = useCallback(
    async (file: File) => {
      try {
        const result = await parseCsv(file)
        const columns = result.meta.fields ?? []
        if (!columns.length) {
          throw new Error('CSV is missing a header row')
        }

        const parsedRows = result.data
          .map((row) => {
            const normalized: Record<string, string> = {}
            columns.forEach((column) => {
              normalized[column] = normalizeValue(row[column])
            })
            return normalized
          })
          .filter((row) => Object.values(row).some((value) => value.length > 0))

        if (!parsedRows.length) {
          throw new Error('CSV does not contain any rows with data')
        }

        const samplesByColumn: Record<string, string[]> = {}
        columns.forEach((column) => {
          samplesByColumn[column] = parsedRows
            .map((row) => row[column])
            .filter((value): value is string => !!value && value.length > 0)
            .slice(0, 5)
        })

        setCsvSummary({
          columns,
          rowCount: parsedRows.length,
          fileName: file.name,
          fileSize: file.size,
          samplesByColumn,
          previewRows: parsedRows.slice(0, PREVIEW_ROW_COUNT),
        })
        setRows(parsedRows)
        setSelectedFile(file)
        setDropError(null)
        form.setValue('csvFile', file, { shouldValidate: true })
        replace([])

        if (columns.length && columns[0]) {
          form.setValue('geometryColumn', columns[0], {
            shouldValidate: true,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to read CSV file'
        setDropError(message)
        setCsvSummary(null)
        setRows([])
        setSelectedFile(null)
        form.setError('csvFile', { message })
      }
    },
    [form, replace],
  )

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        void processFile(file)
      }
      event.target.value = ''
    },
    [processFile],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (
      event.currentTarget.contains(event.relatedTarget as Node | null) &&
      event.relatedTarget !== null
    ) {
      return
    }
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer.files?.[0]
      if (file) {
        void processFile(file)
      }
    },
    [processFile],
  )

  const handleIndicatorSelect = useCallback(
    (column: string, indicator: IndicatorListItem | null) => {
      const currentMappings = form.getValues('indicatorMappings')
      const index = currentMappings.findIndex((m) => m.column === column)

      if (indicator) {
        const existingMapping = index >= 0 ? currentMappings[index] : undefined
        const nextMapping: ColumnMapping = {
          column,
          indicatorId: indicator.id,
          timePoint: existingMapping?.timePoint ?? new Date().toISOString(),
        }

        if (index >= 0) {
          update(index, nextMapping)
        } else {
          append(nextMapping)
        }
      } else if (index >= 0) {
        remove(index)
      }
    },
    [append, form, remove, update],
  )

  const handleTimePointChange = useCallback(
    (column: string, date: Date | null) => {
      if (!date) return
      const currentMappings = form.getValues('indicatorMappings')
      const index = currentMappings.findIndex((m) => m.column === column)
      if (index === -1) return
      const mapping = currentMappings[index]
      if (!mapping) return
      update(index, {
        ...mapping,
        timePoint: date.toISOString(),
      })
    },
    [form, update],
  )

  useEffect(() => {
    if (!geometryColumn) return
    const currentMappings = form.getValues('indicatorMappings')
    const index = currentMappings.findIndex((m) => m.column === geometryColumn)
    if (index >= 0) {
      remove(index)
    }
  }, [geometryColumn, form, remove])

  // Derive a stable primitive key from the mapped column names only.
  // This avoids recomputing warnings when only timePoints change (which warnings don't use).
  const mappedColumnsKey = indicatorMappings.map((m) => m.column).join('\0')

  const warnings = useMemo(() => {
    if (!rows.length) {
      return []
    }

    const nextWarnings: string[] = []

    if (geometryColumn) {
      const missingGeometry = rows.filter(
        (row) => !normalizeValue(row[geometryColumn]).length,
      ).length
      if (missingGeometry) {
        nextWarnings.push(
          `${missingGeometry} row${missingGeometry === 1 ? '' : 's'} are missing a value in column "${geometryColumn}".`,
        )
      }
    }

    const mappedColumns = mappedColumnsKey ? mappedColumnsKey.split('\0') : []
    mappedColumns.forEach((column) => {
      const invalidValues = rows.filter((row) => {
        const raw = row[column]
        if (!raw || !raw.length) {
          return true
        }
        const numericValue = Number(raw)
        return !Number.isFinite(numericValue)
      }).length

      if (invalidValues) {
        nextWarnings.push(
          `${invalidValues} row${invalidValues === 1 ? '' : 's'} in column "${column}" are missing values or contain non-numeric data.`,
        )
      }
    })

    return nextWarnings
  }, [geometryColumn, rows, mappedColumnsKey])

  const onSubmit = form.handleSubmit((values) => {
    if (!values.csvFile || !csvSummary) {
      const message = 'Please add a CSV file before importing'
      setDropError(message)
      form.setError('csvFile', { message })
      return
    }

    importProductOutputs.mutate(values, {
      onSuccess: (response) => {
        if (response?.data.warnings?.length) {
          toast.warning(
            'CSV import completed with warnings - see console for details',
            {
              description: response.data.warnings
                .map((warning) => warning.message)
                .join(', '),
            },
          )
          console.warn(response?.data.warnings)
        } else {
          toast.success('CSV import completed')
        }

        form.reset({
          ...defaultValues,
          productRunId: productRunId ?? '',
        })
        resetCsvState()
        onCompleted()
      },
      onError: (error) => {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Failed to import product outputs'
        setDropError(message)
        toast.error(message)
      },
    })
  })

  const indicatorMappingsError =
    (
      form.formState.errors.indicatorMappings as {
        message?: string
        root?: { message?: string }
      }
    )?.message ??
    (
      form.formState.errors.indicatorMappings as {
        message?: string
        root?: { message?: string }
      }
    )?.root?.message ??
    ''

  const columnOptions = csvSummary?.columns ?? []
  const isImporting = importProductOutputs.isPending

  return (
    <Form {...form}>
      <form className="min-w-0 space-y-6" onSubmit={onSubmit}>
        <FormField
          control={form.control}
          name="csvFile"
          render={() => (
            <FormItem>
              <FormLabel>CSV file</FormLabel>
              <div className="grid gap-2">
                <div
                  className={cn(
                    'rounded-lg border border-dashed border-gray-300 p-6 text-center transition-colors',
                    {
                      'opacity-50 pointer-events-none': isImporting,
                      'bg-muted': isDragActive,
                    },
                  )}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Drag & drop your CSV file here
                    </p>
                    <p>
                      Include one row per geometry with columns for each
                      indicator.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBrowseClick}
                        disabled={isImporting}
                      >
                        Browse files
                      </Button>
                      {csvSummary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetCsvState}
                          disabled={isImporting}
                        >
                          Remove file
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                />
                {selectedFile && csvSummary ? (
                  <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2 text-left">
                    <div className="font-medium text-foreground">
                      {csvSummary.fileName} · {formatBytes(csvSummary.fileSize)}
                    </div>
                    <div>
                      {csvSummary.rowCount} row
                      {csvSummary.rowCount === 1 ? '' : 's'} across{' '}
                      {csvSummary.columns.length} column
                      {csvSummary.columns.length === 1 ? '' : 's'}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-left">
                    Drop a CSV file to preview the available columns and sample
                    data.
                  </p>
                )}
                {dropError ? (
                  <p className="text-sm text-destructive">{dropError}</p>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="geometryColumn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Geometry column</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  disabled={!columnOptions.length}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {columnOptions.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {geometriesRunId ? (
                    <>
                      Note: the Geometry Output ID will be{' '}
                      <code>{'$GEOMETRIES_RUN_ID-{column-value}'}</code>.
                    </>
                  ) : (
                    'Each geometry value will be prefixed with the geometries run ID.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {csvSummary ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Column mappings</FormLabel>
              <span className="text-sm text-muted-foreground">
                Map columns to indicators to create product outputs.
              </span>
            </div>
            <div className="grid gap-3">
              {csvSummary.columns.map((column) => {
                const indicatorMapping = indicatorMappings.find(
                  (mapping) => mapping.column === column,
                )

                return (
                  <ColumnMappingRow
                    key={column}
                    column={column}
                    geometryColumn={geometryColumn}
                    isImporting={isImporting}
                    samples={csvSummary.samplesByColumn[column]}
                    indicatorId={indicatorMapping?.indicatorId ?? null}
                    timePoint={indicatorMapping?.timePoint ?? null}
                    onIndicatorSelect={handleIndicatorSelect}
                    onTimePointChange={handleTimePointChange}
                  />
                )
              })}
            </div>
            {indicatorMappingsError ? (
              <p className="text-sm text-destructive">
                {indicatorMappingsError}
              </p>
            ) : null}
          </div>
        ) : null}

        {csvSummary ? (
          <div className="space-y-2">
            <FormLabel>Data preview</FormLabel>
            <div className="min-w-0 overflow-x-auto rounded-md border">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr>
                    {csvSummary.columns.map((column) => (
                      <th
                        key={column}
                        className="px-2 py-1 text-left font-medium bg-muted/50"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvSummary.previewRows.map((row, index) => (
                    <tr key={`preview-${index}`} className="odd:bg-muted/30">
                      {csvSummary.columns.map((column) => (
                        <td key={`${column}-${index}`} className="px-2 py-1">
                          {row[column] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <FormLabel>Warnings</FormLabel>
          {warnings.length ? (
            <ul className="list-disc pl-5 text-sm text-amber-600 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No issues detected with the current selections.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isImporting ||
              !selectedFile ||
              !geometryColumn ||
              !indicatorMappings.length
            }
          >
            {isImporting ? 'Importing...' : 'Import CSV'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const ProductOutputsImportDialog = ({
  productRunId,
  geometriesRunId,
}: {
  productRunId?: string
  geometriesRunId?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const dirtyRef = useRef(false)

  const handleOpenChange = (next: boolean) => {
    if (!next && dirtyRef.current) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?',
      )
      if (!confirmed) return
    }
    setIsOpen(next)
    if (!next) {
      dirtyRef.current = false
      setFormKey((prev) => prev + 1)
    }
  }

  const isDisabled = !productRunId || !geometriesRunId

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <span>
          <Button variant="outline" disabled={isDisabled}>
            Import CSV
          </Button>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Product Outputs</DialogTitle>
        </DialogHeader>
        {isOpen ? (
          <ProductOutputsImportForm
            key={formKey}
            productRunId={productRunId}
            geometriesRunId={geometriesRunId}
            dirtyRef={dirtyRef}
            onCompleted={() => handleOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
