'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetRunSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { formatDateTime } from '@repo/ui/lib/date'
import { pluralize } from '@repo/ui/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import {
  getEditModeHref,
  OverviewSection,
  OverviewText,
  ResourceHeaderActions,
  ResourceTitleBlock,
} from '~/app/console/_components/resource-detail-mode'
import { CrudForm } from '../../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../../components/form/crud-form-action'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { DATASETS_RUNS_BASE_PATH } from '../../../../../lib/paths'
import { DetailCard } from '../../../_components/detail-cards'
import { GeographicBoundsPickerDialog } from '../../../_components/geographic-bounds-picker-dialog'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  ResourcePageTabs,
  type ResourceTab,
} from '../../../_components/resource-page-tabs'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { VersionStatusBadge } from '../../../_components/version-status-badge'
import type { DatasetExploreTableProps } from '../../../dataset/_components/dataset-explore-table'
import { DatasetRunSummaryCard } from '../../../dataset/_components/dataset-run-summary-card'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import type { DatasetRunMapProps } from '../../../dataset/_components/dataset-run-map'
import { WorkflowDagChart } from '../../../../../components/workflow-dag-chart'
import { SimpleWorkflowDagChart } from '../../../../../components/simple-workflow-dag-chart'
import { toastError } from '../../../../../utils/error-handling'
import {
  type DatasetRunDetail,
  type UpdateDatasetRunPayload,
  useDatasetRun,
  useSetDatasetMainRun,
  useUpdateDatasetRun,
} from '../../../dataset/_hooks'
import { DatasetBreadcrumbs } from '../../../dataset/_components/breadcrumbs'
import { useProductRunsLink } from '../../../product/_hooks'

const formId = 'dataset-run-detail-form'

const DatasetRunMap = dynamic<DatasetRunMapProps>(
  () =>
    import('../../../dataset/_components/dataset-run-map').then(
      (module) => module.DatasetRunMap,
    ),
  { ssr: false },
)

const DatasetExploreTable = dynamic<DatasetExploreTableProps>(
  () =>
    import('../../../dataset/_components/dataset-explore-table').then(
      (module) => module.DatasetExploreTable,
    ),
  { ssr: false },
)

const getDatasetRunPath = (datasetRunId: string) =>
  `${DATASETS_RUNS_BASE_PATH}/${datasetRunId}`

const getDatasetRunFormValues = (
  datasetRun: DatasetRunDetail,
): UpdateDatasetRunPayload => ({
  name: datasetRun.name,
  description: datasetRun.description,
  bounds: datasetRun.bounds,
})

const DatasetRunDetails = () => {
  const datasetRunQuery = useDatasetRun()
  const datasetRun = datasetRunQuery.data
  const updateDatasetRun = useUpdateDatasetRun()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: datasetRun,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ResourceTab>('overview')
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = datasetRun
    ? getDatasetRunPath(datasetRun.id)
    : DATASETS_RUNS_BASE_PATH

  const productRunsLink = useProductRunsLink()
  const setDatasetMainRun = useSetDatasetMainRun(datasetRun)
  const isMainRun = datasetRun?.id === datasetRun?.dataset.mainRunId

  const formActions: CrudFormAction[] = useMemo(
    () =>
      canEdit
        ? [
            {
              title: 'Set as Latest Version',
              description: 'Set this as the latest version for the dataset',
              buttonVariant: 'default',
              buttonTitle: 'Set as Latest Version',
              mutation: setDatasetMainRun,
              disabled: isMainRun,
            },
          ]
        : [],
    [canEdit, isMainRun, setDatasetMainRun],
  )

  const form = useForm<UpdateDatasetRunPayload>({
    resolver: zodResolver(updateDatasetRunSchema),
    defaultValues: {
      name: '',
      description: null,
      bounds: null,
    },
  })
  const isDirty = form.formState.isDirty
  const formBounds = form.watch('bounds')

  useEffect(() => {
    if (datasetRun && !isDirty) {
      form.reset(getDatasetRunFormValues(datasetRun))
    }
  }, [datasetRun, form, isDirty])

  const discardEdits = useCallback(() => {
    if (!datasetRun) {
      return
    }

    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to discard your edits?',
      )
    ) {
      return
    }

    form.reset(getDatasetRunFormValues(datasetRun))
    router.replace(resourcePath)
  }, [datasetRun, form, isDirty, resourcePath, router])

  const datasetStyle = datasetRun?.dataset?.style ?? null
  const mapDataType = datasetRun?.dataType
  const mapDataUrl = datasetRun?.dataUrl
  const mapShouldRender =
    !!mapDataUrl &&
    ((mapDataType === 'geoparquet' && !!datasetRun?.dataPmtilesUrl) ||
      mapDataType === 'stac-geoparquet')
  const tableShouldRender =
    !!mapDataUrl &&
    (mapDataType === 'geoparquet' || mapDataType === 'stac-geoparquet')

  const overview =
    datasetRun && !isEditMode ? (
      <div className="flex flex-col gap-4">
        <DatasetRunSummaryCard run={datasetRun} />
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <OverviewSection title="About">
            <OverviewText>
              {datasetRun.description ?? 'No description.'}
            </OverviewText>
          </OverviewSection>
          <OverviewSection title="Run details">
            <OverviewText>
              {`Dataset: ${datasetRun.dataset.name}
Created: ${formatDateTime(datasetRun.createdAt)}
Updated: ${formatDateTime(datasetRun.updatedAt)}
Data type: ${datasetRun.dataType ?? 'Not recorded'}`}
            </OverviewText>
          </OverviewSection>
        </div>
      </div>
    ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          datasetRun ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Dataset run"
              savePending={updateDatasetRun.isPending}
            />
          ) : null
        }
        breadcrumbs={<DatasetBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={datasetRunQuery.error}
        errorMessage="Failed to load dataset run"
        isLoading={datasetRunQuery.isLoading}
        loadingMessage="Loading dataset run"
        notFoundMessage="Dataset run not found"
      >
        {datasetRun ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  {isEditMode ? (
                    <div className="flex w-full max-w-[462px] flex-col items-start gap-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-xl font-semibold leading-7 shadow-none"
                                placeholder="Dataset run name"
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-sm leading-5 shadow-none"
                                placeholder="Description"
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <ResourceTitleBlock
                      title={datasetRun.name ?? 'Untitled dataset run'}
                      description={datasetRun.description ?? 'No description'}
                      extra={
                        isMainRun ? (
                          <VersionStatusBadge status="latest" />
                        ) : null
                      }
                    />
                  )}
                </div>

                {isEditMode ? (
                  <CrudForm
                    form={form}
                    formId={formId}
                    mutation={updateDatasetRun}
                    entityName="Dataset Run"
                    entityNamePlural="dataset runs"
                    actions={formActions}
                    hiddenFields={[
                      'id',
                      'name',
                      'description',
                      'metadata',
                      'visibility',
                    ]}
                    showSubmitAction={false}
                    successMessage="Dataset run saved"
                    onError={(error) =>
                      toastError(error, 'Failed to update dataset run')
                    }
                    onSuccess={() => router.replace(resourcePath)}
                  >
                    <CrudFormRunFields form={form} readOnlyFields="all" />
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
                      <WorkflowDagChart
                        workflowDag={datasetRun.workflowDag}
                        runType="dataset"
                      />
                      {datasetRun.workflowDagSimple ? (
                        <SimpleWorkflowDagChart
                          workflowDagSimple={datasetRun.workflowDagSimple}
                        />
                      ) : null}
                    </div>
                  </CrudForm>
                ) : (
                  <ResourcePageTabs
                    enabledTabs={['overview', 'explore', 'lineage', 'usage']}
                    value={activeTab}
                    onValueChange={setActiveTab}
                    overview={overview}
                    exploreMap={
                      mapShouldRender && mapDataType && mapDataUrl ? (
                        <DatasetRunMap
                          dataType={mapDataType}
                          dataUrl={mapDataUrl}
                          dataPmtilesUrl={datasetRun.dataPmtilesUrl}
                          datasetStyle={datasetStyle}
                        />
                      ) : undefined
                    }
                    exploreTable={
                      tableShouldRender && mapDataType && mapDataUrl ? (
                        <DatasetExploreTable
                          dataType={mapDataType}
                          dataUrl={mapDataUrl}
                        />
                      ) : undefined
                    }
                    lineage={
                      <WorkflowDagChart
                        workflowDag={datasetRun.workflowDag}
                        runType="dataset"
                      />
                    }
                    workflowDagSimple={datasetRun.workflowDagSimple}
                    usage={
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <DetailCard
                          title={`${datasetRun.productRunCount} ${pluralize(datasetRun.productRunCount, 'product run', 'product runs')}`}
                          description="Used by Product Runs"
                          actionText="Open"
                          actionLink={productRunsLink(null, {
                            datasetRunId: datasetRun.id,
                          })}
                        />
                        <ResourceUsageDetailCards
                          reportCount={datasetRun.reportCount}
                          dashboardCount={datasetRun.dashboardCount}
                          reportQuery={{ datasetRunId: datasetRun.id }}
                          dashboardQuery={{ datasetRunId: datasetRun.id }}
                        />
                      </div>
                    }
                  />
                )}
              </div>
            </div>
          </Form>
        ) : null}
      </ResourcePageState>
    </div>
  )
}

export default DatasetRunDetails
