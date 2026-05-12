'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { toast } from '@repo/ui/components/ui/sonner'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import {
  getEditModeHref,
  getResourceVisibilityChangeSummary,
  OverviewSection,
  OverviewText,
  ResourceHeaderActions,
  ResourceTitleBlock,
  ResourceVisibilitySelect,
} from '~/app/console/_components/resource-detail-mode'
import {
  type VisibilityImpactDialogState,
  VisibilityImpactDialog,
} from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { DATASETS_BASE_PATH } from '../../../../lib/paths'
import {
  canChangeConsoleResourceVisibility,
  canEditConsoleResource,
  formatVisibility,
  getConsoleResourceVisibilityOptions,
  getCreatedByUserId,
  type ResourceVisibility,
} from '../../../../utils/access-control'
import { toastError } from '../../../../utils/error-handling'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import {
  ResourcePageTabs,
  type ResourceTab,
} from '../../_components/resource-page-tabs'
import { DatasetRunMap } from '../_components/dataset-run-map'
import { DatasetExploreTable } from '../_components/dataset-explore-table'
import DatasetRunFeature from './runs/client'
import { DatasetBreadcrumbs } from '../_components/breadcrumbs'
import {
  type DatasetDetail,
  type UpdateDatasetPayload,
  useDataset,
  usePreviewDatasetVisibility,
  useUpdateDataset,
  useUpdateDatasetVisibility,
} from '../_hooks'

type DatasetVisibilityDialogState = VisibilityImpactDialogState & {
  nextVisibility: ResourceVisibility
}

const formId = 'dataset-detail-form'

const getDatasetPath = (datasetId: string) =>
  `${DATASETS_BASE_PATH}/${datasetId}`

const getDatasetFormValues = (
  dataset: DatasetDetail,
): UpdateDatasetPayload => ({
  name: dataset.name,
  description: dataset.description,
  mainRunId: dataset.mainRunId,
  style: dataset.style,
})

const DatasetDetails = () => {
  const datasetQuery = useDataset()
  const dataset = datasetQuery.data
  const updateDataset = useUpdateDataset()
  const updateDatasetVisibility = useUpdateDatasetVisibility()
  const previewDatasetVisibility = usePreviewDatasetVisibility()
  const { access } = useAccessControl()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ResourceTab>('overview')
  const [visibilityDialog, setVisibilityDialog] =
    useState<DatasetVisibilityDialogState | null>(null)

  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(dataset),
      resource: 'dataset',
      resourceData: dataset,
    })
  const canEdit =
    !!dataset &&
    canEditConsoleResource({
      access,
      resource: 'dataset',
      createdByUserId: getCreatedByUserId(dataset),
      resourceData: dataset,
    }) &&
    !requiresOrganizationSwitch
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = dataset ? getDatasetPath(dataset.id) : DATASETS_BASE_PATH

  const form = useForm<UpdateDatasetPayload>({
    resolver: zodResolver(updateDatasetSchema),
    defaultValues: {
      name: '',
      description: null,
      mainRunId: null,
      style: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (dataset && !isDirty) {
      form.reset(getDatasetFormValues(dataset))
    }
  }, [dataset, form, isDirty])

  const visibilityOptions =
    dataset && canEdit
      ? getConsoleResourceVisibilityOptions({
          access,
          currentVisibility: dataset.visibility,
          resourceData: dataset,
        })
      : []
  const canChangeVisibility =
    dataset && canEdit
      ? canChangeConsoleResourceVisibility({
          access,
          currentVisibility: dataset.visibility,
          resourceData: dataset,
        })
      : false

  const discardEdits = useCallback(() => {
    if (!dataset) {
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

    form.reset(getDatasetFormValues(dataset))
    router.replace(resourcePath)
  }, [dataset, form, isDirty, resourcePath, router])

  const previewVisibilityChange = useCallback(
    async (nextVisibility: ResourceVisibility) => {
      if (!dataset || nextVisibility === dataset.visibility) {
        return
      }

      const preview = await previewDatasetVisibility
        .mutateAsync({ visibility: nextVisibility })
        .catch((error) => {
          toastError(error, 'Failed to preview visibility change')
          return null
        })

      if (!preview) {
        return
      }

      setVisibilityDialog({
        title: `Change visibility to ${formatVisibility(nextVisibility)}`,
        description: getResourceVisibilityChangeSummary(
          'dataset',
          nextVisibility,
        ),
        impact: preview,
        nextVisibility,
      })
    },
    [dataset, previewDatasetVisibility],
  )

  const confirmVisibilityChange = useCallback(() => {
    if (!dataset || !visibilityDialog) {
      return
    }

    updateDatasetVisibility.mutate(
      { visibility: visibilityDialog.nextVisibility },
      {
        onError: (error) => {
          toastError(error, 'Failed to update dataset visibility')
        },
        onSuccess: () => {
          setVisibilityDialog(null)
          toast.success('Dataset visibility updated')
        },
      },
    )
  }, [dataset, updateDatasetVisibility, visibilityDialog])

  const overview = dataset ? (
    isEditMode ? (
      <CrudForm
        form={form}
        formId={formId}
        mutation={updateDataset}
        entityName="Dataset"
        entityNamePlural="datasets"
        hiddenFields={['id', 'name', 'description', 'metadata']}
        showSubmitAction={false}
        successMessage="Dataset saved"
        onError={(error) => toastError(error, 'Failed to update dataset')}
        onSuccess={() => router.replace(resourcePath)}
      >
        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Style (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"type":"raster","display":"categorical","asset":"mangroves","values":{"1":{"color":"rgba(0,196,23,1)","label":"Mangrove"}}}'
                  className="min-h-32 font-mono text-xs"
                  rows={6}
                  value={
                    field.value != null
                      ? typeof field.value === 'string'
                        ? field.value
                        : JSON.stringify(field.value, null, 2)
                      : ''
                  }
                  onChange={(event) => {
                    const raw = event.target.value

                    if (!raw.trim()) {
                      field.onChange(null)
                      return
                    }

                    try {
                      field.onChange(JSON.parse(raw))
                    } catch {
                      field.onChange(raw)
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CrudForm>
    ) : (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="About">
          <OverviewText>
            {dataset.description ?? 'No description.'}
          </OverviewText>
        </OverviewSection>
      </div>
    )
  ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          dataset ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Dataset"
              savePending={updateDataset.isPending}
            />
          ) : null
        }
        breadcrumbs={<DatasetBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={datasetQuery.error}
        errorMessage="Failed to load dataset"
        isLoading={datasetQuery.isLoading}
        loadingMessage="Loading dataset"
        notFoundMessage="Dataset not found"
      >
        {dataset ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                {requiresOrganizationSwitch ? (
                  <ActiveOrganizationWriteWarning
                    visibility={dataset.visibility}
                  />
                ) : null}

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
                                placeholder="Dataset name"
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
                              <Textarea
                                {...field}
                                className="min-h-24 resize-y rounded-lg border-input bg-transparent px-3 py-2 text-sm leading-5 shadow-none"
                                placeholder="Description"
                                rows={3}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <ResourceVisibilitySelect
                        canChange={canChangeVisibility}
                        currentVisibility={dataset.visibility}
                        isPending={
                          previewDatasetVisibility.isPending ||
                          updateDatasetVisibility.isPending
                        }
                        onPreviewChange={previewVisibilityChange}
                        options={visibilityOptions}
                      />
                    </div>
                  ) : (
                    <ResourceTitleBlock
                      title={dataset.name ?? 'Untitled dataset'}
                      description={dataset.description ?? 'No description'}
                      visibility={dataset.visibility}
                    />
                  )}
                </div>

                <ResourcePageTabs
                  value={isEditMode ? 'overview' : activeTab}
                  onValueChange={setActiveTab}
                  disabled={isEditMode}
                  overview={overview}
                  exploreMap={
                    dataset.mainRun?.dataUrl &&
                    ((dataset.mainRun.dataType === 'geoparquet' &&
                      dataset.mainRun.dataPmtilesUrl) ||
                      dataset.mainRun.dataType === 'stac-geoparquet') ? (
                      <DatasetRunMap
                        dataType={dataset.mainRun.dataType}
                        dataUrl={dataset.mainRun.dataUrl}
                        dataPmtilesUrl={dataset.mainRun.dataPmtilesUrl}
                        datasetStyle={dataset.style ?? null}
                      />
                    ) : undefined
                  }
                  exploreTable={
                    dataset.mainRun?.dataUrl &&
                    (dataset.mainRun.dataType === 'stac-geoparquet' ||
                      dataset.mainRun.dataType === 'geoparquet') ? (
                      <DatasetExploreTable
                        dataUrl={dataset.mainRun.dataUrl}
                        dataType={dataset.mainRun.dataType}
                      />
                    ) : undefined
                  }
                  lineage={
                    dataset.mainRun ? (
                      <WorkflowDagChart
                        workflowDag={dataset.mainRun.workflowDag}
                        runType="dataset"
                        isMainRoute
                      />
                    ) : undefined
                  }
                  workflowDagSimple={dataset.mainRun?.workflowDagSimple}
                  versions={<DatasetRunFeature embedded />}
                  usage={
                    <ResourceUsageDetailCards
                      reportCount={dataset.reportCount}
                      dashboardCount={dataset.dashboardCount}
                      reportQuery={{ datasetId: dataset.id }}
                      dashboardQuery={{ datasetId: dataset.id }}
                    />
                  }
                />
              </div>
            </div>
          </Form>
        ) : null}
        <VisibilityImpactDialog
          open={visibilityDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setVisibilityDialog(null)
            }
          }}
          title={visibilityDialog?.title ?? 'Change visibility'}
          description={visibilityDialog?.description ?? ''}
          impact={visibilityDialog?.impact ?? null}
          closeLabel="Cancel"
          confirmLabel="Confirm"
          confirmDisabled={!visibilityDialog?.impact.canApply}
          confirmLoading={updateDatasetVisibility.isPending}
          onConfirm={confirmVisibilityChange}
        />
      </ResourcePageState>
    </div>
  )
}

export default DatasetDetails
