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
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../_components/geographic-bounds-picker-dialog'
import { DatasetRunButton } from '../../_components/dataset-run-button'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  DatasetRunListItem,
  useCreateDatasetRun,
  useDataset,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'
import { createDatasetRunSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../../../components/table/search-input'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'

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
    return ['createdAt', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [] satisfies ColumnDef<DatasetRunListItem>[]
  }, [])

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
      <div>
        <div className="flex justify-between">
          <h1 className="text-3xl font-medium mb-2">Dataset Runs</h1>
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
        </div>
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search dataset runs"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <GeographicBoundsPickerDialog
              value={geographicBounds}
              onChange={(bounds) =>
                setSearchParams(toGeographicBoundsQuery(bounds))
              }
              onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
            />
          </div>
          <BaseCrudTable
            data={data?.data || []}
            isLoading={isLoading}
            baseColumns={baseColumns}
            extraColumns={columns}
            title="DatasetRun"
            itemLink={datasetLink}
            itemButton={(datasetRun) => (
              <DatasetRunButton datasetRun={datasetRun} />
            )}
            query={query}
            onSortChange={setSearchParams}
          />
          <Pagination
            className="justify-end mt-4"
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      </div>
    </ResourcePageState>
  )
}

export default DatasetRunFeature
