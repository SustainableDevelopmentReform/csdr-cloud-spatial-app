'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { DATASETS_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { DetailCard } from '../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import { SourcesCard } from '../../_components/sources-card'
import { useProductsLink } from '../../product/_hooks'
import { DatasetRunSummaryCard } from '../_components/dataset-run-summary-card'
import { DatasetRunMap } from '../_components/dataset-run-map'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import {
  useDataset,
  useDatasetRunsLink,
  useDeleteDataset,
  usePreviewDatasetVisibility,
  useUpdateDataset,
  useUpdateDatasetVisibility,
} from '../_hooks'

const DatasetDetails = () => {
  const datasetQuery = useDataset()
  const dataset = datasetQuery.data
  const productsLink = useProductsLink()
  const updateDataset = useUpdateDataset()
  const updateDatasetVisibility = useUpdateDatasetVisibility()
  const previewDatasetVisibility = usePreviewDatasetVisibility()
  const deleteDataset = useDeleteDataset(undefined, DATASETS_BASE_PATH)
  const datasetRunsLink = useDatasetRunsLink()
  const { access } = useAccessControl()
  const canEdit = canEditConsoleResource({
    access,
    resource: 'dataset',
    createdByUserId: getCreatedByUserId(dataset),
    resourceData: dataset,
  })
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(dataset),
      resource: 'dataset',
      resourceData: dataset,
    })

  const form = useForm({
    resolver: zodResolver(updateDatasetSchema),
  })

  useEffect(() => {
    if (dataset) {
      form.reset(dataset)
    }
  }, [dataset, form])

  const formActions = useMemo(() => {
    if (!dataset) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateDatasetVisibility,
      previewMutation: previewDatasetVisibility,
      resourceData: dataset,
      successMessage: 'Dataset visibility updated',
      visibility: dataset.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [access, dataset, previewDatasetVisibility, updateDatasetVisibility])

  return (
    <ResourcePageState
      error={datasetQuery.error}
      errorMessage="Failed to load dataset"
      isLoading={datasetQuery.isLoading}
      loadingMessage="Loading dataset"
      notFoundMessage="Dataset not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col">
        {requiresOrganizationSwitch ? (
          <ActiveOrganizationWriteWarning visibility={dataset?.visibility} />
        ) : null}
        {dataset?.mainRun?.dataUrl &&
          ((dataset.mainRun.dataType === 'geoparquet' &&
            dataset.mainRun.dataPmtilesUrl) ||
            dataset.mainRun.dataType === 'stac-geoparquet') && (
            <DatasetRunMap
              dataType={dataset.mainRun.dataType}
              dataUrl={dataset.mainRun.dataUrl}
              dataPmtilesUrl={dataset.mainRun.dataPmtilesUrl}
              datasetStyle={dataset.style ?? null}
            />
          )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DatasetRunSummaryCard run={dataset?.mainRun} mainRun />
          <div className="grid grid-cols-1 gap-4">
            {dataset && (
              <DetailCard
                title={`${dataset?.runCount} ${pluralize(dataset?.runCount, 'run', 'runs')}`}
                description="Dataset Runs"
                actionText="Open"
                actionLink={datasetRunsLink(dataset)}
                actionIcon={<ArrowUpRightIcon />}
              />
            )}
            {dataset && (
              <DetailCard
                title={`${dataset?.productCount} ${pluralize(dataset?.productCount, 'product', 'products')}`}
                description="Products"
                actionText="Open"
                actionLink={productsLink({ datasetId: dataset.id })}
                actionIcon={<ArrowUpRightIcon />}
              />
            )}
            {dataset && <SourcesCard resource={dataset} />}
            {dataset && (
              <ResourceUsageDetailCards
                reportCount={dataset.reportCount}
                dashboardCount={dataset.dashboardCount}
                reportQuery={{ datasetId: dataset.id }}
                dashboardQuery={{ datasetId: dataset.id }}
              />
            )}
          </div>
        </div>
        <CrudForm
          form={form}
          mutation={updateDataset}
          deleteMutation={deleteDataset}
          actions={formActions}
          entityName="Dataset"
          entityNamePlural="datasets"
          readOnly={!canEdit}
          successMessage="Updated Dataset"
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
                    className="font-mono text-xs"
                    rows={4}
                    disabled={!canEdit}
                    value={
                      field.value != null
                        ? typeof field.value === 'string'
                          ? field.value
                          : JSON.stringify(field.value, null, 2)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value
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
          {dataset?.mainRun && (
            <WorkflowDagChart
              workflowDag={dataset.mainRun.workflowDag}
              runType="dataset"
              isMainRoute
            />
          )}
        </CrudForm>
      </div>
    </ResourcePageState>
  )
}

export default DatasetDetails
