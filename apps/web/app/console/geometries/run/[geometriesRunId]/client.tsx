'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesRunSchema } from '@repo/schemas/crud'
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
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
import { GEOMETRIES_RUNS_BASE_PATH } from '../../../../../lib/paths'
import { DetailCard } from '../../../_components/detail-cards'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { useProductRunsLink } from '../../../product/_hooks'
import ChoroplethMapViewer from '../../_components/choropleth-map-viewer'
import { GeometriesRunSummaryCard } from '../../_components/geometries-run-summary-card'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import { WorkflowDagChart } from '../../../../../components/workflow-dag-chart'
import { SimpleWorkflowDagChart } from '../../../../../components/simple-workflow-dag-chart'
import { toastError } from '../../../../../utils/error-handling'
import {
  type GeometriesRunDetail,
  type UpdateGeometriesRunPayload,
  useGeometriesRun,
  useGeometryRunOutputsLink,
  useSetGeometriesMainRun,
  useUpdateGeometriesRun,
} from '../../_hooks'

const formId = 'geometries-run-detail-form'

const getGeometriesRunPath = (geometriesRunId: string) =>
  `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRunId}`

const getGeometriesRunFormValues = (
  geometriesRun: GeometriesRunDetail,
): UpdateGeometriesRunPayload => ({
  name: geometriesRun.name,
  description: geometriesRun.description,
})

const GeometriesRunDetails = () => {
  const geometriesRunQuery = useGeometriesRun()
  const geometriesRun = geometriesRunQuery.data
  const updateGeometriesRun = useUpdateGeometriesRun()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: geometriesRun,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = geometriesRun
    ? getGeometriesRunPath(geometriesRun.id)
    : GEOMETRIES_RUNS_BASE_PATH

  const geometryRunOutputsLink = useGeometryRunOutputsLink()
  const productRunsLink = useProductRunsLink()
  const setGeometriesMainRun = useSetGeometriesMainRun(geometriesRun)
  const isMainRun = geometriesRun?.id === geometriesRun?.geometries.mainRunId

  const formActions: CrudFormAction[] = useMemo(
    () =>
      canEdit
        ? [
            {
              title: 'Set as Main Run',
              description: 'Set this as the main run for the boundaries',
              buttonVariant: 'default',
              buttonTitle: 'Set as Main Run',
              mutation: setGeometriesMainRun,
              disabled: isMainRun,
            },
          ]
        : [],
    [canEdit, isMainRun, setGeometriesMainRun],
  )

  const form = useForm<UpdateGeometriesRunPayload>({
    resolver: zodResolver(updateGeometriesRunSchema),
    defaultValues: {
      name: '',
      description: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (geometriesRun && !isDirty) {
      form.reset(getGeometriesRunFormValues(geometriesRun))
    }
  }, [form, geometriesRun, isDirty])

  const discardEdits = useCallback(() => {
    if (!geometriesRun) {
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

    form.reset(getGeometriesRunFormValues(geometriesRun))
    router.replace(resourcePath)
  }, [form, geometriesRun, isDirty, resourcePath, router])

  const viewContent =
    geometriesRun && !isEditMode ? (
      <>
        <div className="flex flex-col gap-4">
          <ChoroplethMapViewer geometriesRun={geometriesRun} className="h-96" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GeometriesRunSummaryCard run={geometriesRun} />
            <div className="grid grid-cols-1 gap-4">
              <DetailCard
                title={`${geometriesRun.outputCount} ${pluralize(geometriesRun.outputCount, 'output', 'outputs')}`}
                description="Geometry Outputs"
                actionText="Open"
                actionLink={geometryRunOutputsLink(geometriesRun)}
              />
              <DetailCard
                title={`${geometriesRun.productRunCount} ${pluralize(geometriesRun.productRunCount, 'product run', 'product runs')}`}
                description="Used by Products Runs"
                actionText="Open"
                actionLink={productRunsLink(null, {
                  geometriesRunId: geometriesRun.id,
                })}
              />
              <ResourceUsageDetailCards
                reportCount={geometriesRun.reportCount}
                dashboardCount={geometriesRun.dashboardCount}
                reportQuery={{ geometriesRunId: geometriesRun.id }}
                dashboardQuery={{ geometriesRunId: geometriesRun.id }}
              />
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <OverviewSection title="About">
            <OverviewText>
              {geometriesRun.description ?? 'No description.'}
            </OverviewText>
          </OverviewSection>
          <OverviewSection title="Run details">
            <OverviewText>
              {`Boundaries: ${geometriesRun.geometries.name}
Created: ${formatDateTime(geometriesRun.createdAt)}
Updated: ${formatDateTime(geometriesRun.updatedAt)}
Data PMTiles URL: ${geometriesRun.dataPmtilesUrl ?? 'Not recorded'}`}
            </OverviewText>
          </OverviewSection>
        </div>
      </>
    ) : null

  return (
    <ResourcePageState
      error={geometriesRunQuery.error}
      errorMessage="Failed to load geometries run"
      isLoading={geometriesRunQuery.isLoading}
      loadingMessage="Loading geometries run"
      notFoundMessage="Geometries run not found"
    >
      {geometriesRun ? (
        <Form {...form}>
          <div className="flex w-full max-w-[1000px] flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
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
                            placeholder="Boundary run name"
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
                  title={geometriesRun.name ?? 'Untitled boundary run'}
                  description={geometriesRun.description ?? 'No description'}
                  extra={isMainRun ? <span>Latest run</span> : null}
                />
              )}
              <ResourceHeaderActions
                canEdit={canEdit}
                editHref={getEditModeHref(resourcePath)}
                formId={formId}
                isEditMode={isEditMode}
                onDiscard={discardEdits}
                resourcePath={resourcePath}
                resourceTypeLabel="Boundary run"
                savePending={updateGeometriesRun.isPending}
              />
            </div>

            {isEditMode ? (
              <CrudForm
                form={form}
                formId={formId}
                mutation={updateGeometriesRun}
                entityName="Boundary Run"
                entityNamePlural="boundary runs"
                actions={formActions}
                hiddenFields={[
                  'id',
                  'name',
                  'description',
                  'metadata',
                  'visibility',
                ]}
                showSubmitAction={false}
                successMessage="Boundary run saved"
                onError={(error) =>
                  toastError(error, 'Failed to update boundary run')
                }
                onSuccess={() => router.replace(resourcePath)}
              >
                <CrudFormRunFields form={form} readOnlyFields="all" />
                <FormItem>
                  <FormLabel>Data PMTiles URL</FormLabel>
                  <Input
                    disabled
                    value={geometriesRun.dataPmtilesUrl ?? ''}
                    className="bg-gray-100"
                  />
                </FormItem>
                <WorkflowDagChart
                  workflowDag={geometriesRun.workflowDag}
                  runType="geometries"
                />
                {geometriesRun.workflowDagSimple ? (
                  <SimpleWorkflowDagChart
                    workflowDagSimple={geometriesRun.workflowDagSimple}
                  />
                ) : null}
              </CrudForm>
            ) : (
              viewContent
            )}
          </div>
        </Form>
      ) : null}
    </ResourcePageState>
  )
}

export default GeometriesRunDetails
