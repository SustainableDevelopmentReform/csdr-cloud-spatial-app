'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetRunSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../../components/form/crud-form-action'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { DetailCard } from '../../../_components/detail-cards'
import { GeographicBoundsPickerDialog } from '../../../_components/geographic-bounds-picker-dialog'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { DatasetRunSummaryCard } from '../../../dataset/_components/dataset-run-summary-card'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import { DatasetRunMap } from '../../../dataset/_components/dataset-run-map'
import {
  useDatasetRun,
  useDatasetRunsLink,
  useDeleteDatasetRun,
  useSetDatasetMainRun,
  useUpdateDatasetRun,
} from '../../../dataset/_hooks'
import type { DatasetRunDetail } from '../../../dataset/_hooks'
import { useProductRunsLink } from '../../../product/_hooks'

const DatasetRunDetails = () => {
  const datasetRunQuery = useDatasetRun()
  const datasetRun = datasetRunQuery.data as DatasetRunDetail | null | undefined
  const updateDatasetRun = useUpdateDatasetRun()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: datasetRun,
  })

  const datasetRunsLink = useDatasetRunsLink()
  const deleteDatasetRun = useDeleteDatasetRun(
    undefined,
    datasetRun?.dataset ? datasetRunsLink(datasetRun?.dataset) : undefined,
  )

  const productRunsLink = useProductRunsLink()

  const setDatasetMainRun = useSetDatasetMainRun(datasetRun)
  const isMainRun = datasetRun?.id === datasetRun?.dataset.mainRunId

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the dataset',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setDatasetMainRun,
        disabled: isMainRun,
      },
    ],
    [isMainRun, setDatasetMainRun],
  )

  const form = useForm({
    resolver: zodResolver(updateDatasetRunSchema),
  })
  const formBounds = form.watch('bounds')

  useEffect(() => {
    if (datasetRun) {
      form.reset(datasetRun)
    }
  }, [datasetRun, form])

  // The style is stored on the parent dataset, accessed via the run's relation.
  const datasetStyle = datasetRun?.dataset?.style ?? null

  const mapDataType = datasetRun?.dataType
  const mapShouldRender: boolean =
    !!datasetRun?.dataUrl &&
    ((mapDataType === 'geoparquet' && !!datasetRun.dataPmtilesUrl) ||
      mapDataType === 'stac-geoparquet')

  return (
    <ResourcePageState
      error={datasetRunQuery.error}
      errorMessage="Failed to load dataset run"
      isLoading={datasetRunQuery.isLoading}
      loadingMessage="Loading dataset run"
      notFoundMessage="Dataset run not found"
    >
      {mapShouldRender && mapDataType && (
        <DatasetRunMap
          dataType={mapDataType}
          dataUrl={datasetRun.dataUrl!}
          dataPmtilesUrl={datasetRun.dataPmtilesUrl}
          datasetStyle={datasetStyle}
        />
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard run={datasetRun} />
        <div className="grid grid-cols-1 gap-4">
          {datasetRun && (
            <DetailCard
              title={`${datasetRun?.productRunCount} ${pluralize(datasetRun?.productRunCount, 'product run', 'product runs')}`}
              description="Used by Products Runs"
              actionText="Open"
              actionLink={productRunsLink(null, {
                datasetRunId: datasetRun?.id,
              })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {datasetRun && (
            <ResourceUsageDetailCards
              reportCount={datasetRun.reportCount}
              dashboardCount={datasetRun.dashboardCount}
              reportQuery={{ datasetRunId: datasetRun.id }}
              dashboardQuery={{ datasetRunId: datasetRun.id }}
            />
          )}
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateDatasetRun}
        deleteMutation={deleteDatasetRun}
        entityName="Dataset Run"
        entityNamePlural="dataset runs"
        actions={canEdit ? formActions : []}
        hiddenFields={['visibility']}
        readOnly={!canEdit}
        successMessage="Updated Dataset Run"
      >
        <CrudFormRunFields form={form} readOnlyFields={'all'} />
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <FormLabel>Bounds</FormLabel>
            <GeographicBoundsPickerDialog
              value={formBounds ?? null}
              buttonText="Set from map"
              disabled={!canEdit}
              onChange={(bounds) =>
                form.setValue('bounds', bounds, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onClear={() =>
                form.setValue('bounds', null, {
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
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-gray-100' : ''}
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
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-gray-100' : ''}
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
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-gray-100' : ''}
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
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-gray-100' : ''}
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
      </CrudForm>
    </ResourcePageState>
  )
}

export default DatasetRunDetails
