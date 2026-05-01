'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../../../components/table/table-row-delete-action'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { ConsoleCrudListFrame } from '../../../_components/console-crud-list-frame'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../_components/geographic-bounds-picker-dialog'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  DatasetRunListItem,
  useCreateDatasetRun,
  useDataset,
  useDeleteDatasetRun,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'
import { createDatasetRunSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../../../components/table/search-input'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'

const DatasetRunDeleteAction = ({
  datasetRun,
}: {
  datasetRun: DatasetRunListItem
}) => {
  const deleteDatasetRun = useDeleteDatasetRun(datasetRun.id)

  return (
    <TableRowDeleteAction
      entityName="dataset run"
      itemName={datasetRun.name}
      mutation={deleteDatasetRun}
    />
  )
}

const DatasetRunFeature = () => {
  const datasetQuery = useDataset()
  const dataset = datasetQuery.data
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useDatasetRuns(undefined, undefined, true)
  const createDatasetRun = useCreateDatasetRun()
  const datasetLink = useDatasetRunLink()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: dataset,
  })
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [
      {
        id: 'latestRun',
        header: 'Latest run',
        cell: ({ row }) => {
          const isLatest = dataset?.mainRunId === row.original.id

          return (
            <span
              className={isLatest ? 'text-foreground' : 'text-muted-foreground'}
            >
              {isLatest ? 'Latest' : 'No'}
            </span>
          )
        },
        size: 140,
      },
    ] satisfies ColumnDef<DatasetRunListItem>[]
  }, [dataset?.mainRunId])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    if (!geographicBounds) {
      return []
    }

    return [
      {
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      },
    ]
  }, [geographicBounds, setSearchParams])

  const form = useForm({
    resolver: zodResolver(createDatasetRunSchema),
  })
  const formBounds = form.watch('bounds')

  useEffect(() => {
    if (!dataset) return
    form.setValue('datasetId', dataset.id)
  }, [dataset, form])

  return (
    <ResourcePageState
      error={datasetQuery.error}
      errorMessage="Failed to load dataset"
      isLoading={datasetQuery.isLoading}
      loadingMessage="Loading dataset"
      notFoundMessage="Dataset not found"
    >
      <ConsoleCrudListFrame
        title="Dataset Runs"
        description="Create and manage runs for this dataset."
        actions={
          <CrudFormDialog
            form={form}
            mutation={createDatasetRun}
            buttonText="Add Dataset Run"
            entityName="Dataset Run"
            entityNamePlural="dataset runs"
            hiddenFields={['visibility']}
            hideTrigger={!canEdit}
          >
            <CrudFormRunFields form={form} />
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <FormLabel>Bounds</FormLabel>
                <GeographicBoundsPickerDialog
                  value={formBounds ?? null}
                  buttonText="Set from map"
                  onChange={(bounds) =>
                    form.setValue('bounds', bounds, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onClear={() =>
                    form.setValue('bounds', undefined, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="bounds.minX"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bounds.maxX"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bounds.minY"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bounds.maxY"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CrudFormDialog>
        }
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.data.length}
            totalCount={data?.totalCount}
            onLoadMore={() => fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search dataset runs"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <GeographicBoundsPickerDialog
                title="Area of Interest"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams(toGeographicBoundsQuery(bounds))
                }
                onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
              />
            </TableFilterPopover>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="DatasetRun"
          itemLink={datasetLink}
          canModifyItem={() => canEdit}
          deleteAction={(datasetRun) => (
            <DatasetRunDeleteAction datasetRun={datasetRun} />
          )}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </ResourcePageState>
  )
}

export default DatasetRunFeature
