'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { GEOMETRIES_BASE_PATH } from '../../../../lib/paths'
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
import ChoroplethMapViewer, {
  type GeometryOutputMapSelection,
} from '../_components/choropleth-map-viewer'
import { GeometryOutputDetailsSidebar } from '../_components/geometry-output-details-sidebar'
import { GeometriesMainRunOutputsTable } from '../_components/geometries-main-run-outputs-table'
import GeometriesRunFeature from './runs/client'
import { GeometriesBreadcrumbs } from '../_components/breadcrumbs'
import {
  type GeometriesDetail,
  type UpdateGeometriesPayload,
  useGeometries,
  usePreviewGeometriesVisibility,
  useUpdateGeometries,
  useUpdateGeometriesVisibility,
} from '../_hooks'

type GeometriesVisibilityDialogState = VisibilityImpactDialogState & {
  nextVisibility: ResourceVisibility
}

const formId = 'geometries-detail-form'

const getGeometriesPath = (geometriesId: string) =>
  `${GEOMETRIES_BASE_PATH}/${geometriesId}`

const getGeometriesFormValues = (
  geometries: GeometriesDetail,
): UpdateGeometriesPayload => ({
  name: geometries.name,
  description: geometries.description,
  mainRunId: geometries.mainRunId,
})

const GeometriesDetails = () => {
  const geometriesQuery = useGeometries()
  const geometries = geometriesQuery.data
  const updateGeometries = useUpdateGeometries()
  const updateGeometriesVisibility = useUpdateGeometriesVisibility()
  const previewGeometriesVisibility = usePreviewGeometriesVisibility()
  const { access } = useAccessControl()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ResourceTab>('overview')
  const [visibilityDialog, setVisibilityDialog] =
    useState<GeometriesVisibilityDialogState | null>(null)
  const [selectedGeometryOutputId, setSelectedGeometryOutputId] = useState<
    string | null
  >(null)

  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(geometries),
      resource: 'geometries',
      resourceData: geometries,
    })
  const canEdit =
    !!geometries &&
    canEditConsoleResource({
      access,
      resource: 'geometries',
      createdByUserId: getCreatedByUserId(geometries),
      resourceData: geometries,
    }) &&
    !requiresOrganizationSwitch
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = geometries
    ? getGeometriesPath(geometries.id)
    : GEOMETRIES_BASE_PATH

  const form = useForm<UpdateGeometriesPayload>({
    resolver: zodResolver(updateGeometriesSchema),
    defaultValues: {
      name: '',
      description: null,
      mainRunId: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (geometries && !isDirty) {
      form.reset(getGeometriesFormValues(geometries))
    }
  }, [form, geometries, isDirty])

  const visibilityOptions =
    geometries && canEdit
      ? getConsoleResourceVisibilityOptions({
          access,
          currentVisibility: geometries.visibility,
          resourceData: geometries,
        })
      : []
  const canChangeVisibility =
    geometries && canEdit
      ? canChangeConsoleResourceVisibility({
          access,
          currentVisibility: geometries.visibility,
          resourceData: geometries,
        })
      : false

  const discardEdits = useCallback(() => {
    if (!geometries) {
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

    form.reset(getGeometriesFormValues(geometries))
    router.replace(resourcePath)
  }, [form, geometries, isDirty, resourcePath, router])

  const previewVisibilityChange = useCallback(
    async (nextVisibility: ResourceVisibility) => {
      if (!geometries || nextVisibility === geometries.visibility) {
        return
      }

      const preview = await previewGeometriesVisibility
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
          'boundaries',
          nextVisibility,
        ),
        impact: preview,
        nextVisibility,
      })
    },
    [geometries, previewGeometriesVisibility],
  )

  const confirmVisibilityChange = useCallback(() => {
    if (!geometries || !visibilityDialog) {
      return
    }

    updateGeometriesVisibility.mutate(
      { visibility: visibilityDialog.nextVisibility },
      {
        onError: (error) => {
          toastError(error, 'Failed to update boundaries visibility')
        },
        onSuccess: () => {
          setVisibilityDialog(null)
          toast.success('Boundaries visibility updated')
        },
      },
    )
  }, [geometries, updateGeometriesVisibility, visibilityDialog])

  const closeGeometryOutputDetails = useCallback(() => {
    setSelectedGeometryOutputId(null)
  }, [])

  const openGeometryOutputDetails = useCallback(
    (selection: GeometryOutputMapSelection) => {
      setSelectedGeometryOutputId(selection.geometryOutputId)
    },
    [],
  )

  useEffect(() => {
    if (!selectedGeometryOutputId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGeometryOutputDetails()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeGeometryOutputDetails, selectedGeometryOutputId])

  const overview = geometries ? (
    isEditMode ? (
      <CrudForm
        form={form}
        formId={formId}
        mutation={updateGeometries}
        entityName="Boundaries"
        entityNamePlural="boundary sets"
        hiddenFields={['id', 'name', 'description', 'metadata']}
        showSubmitAction={false}
        successMessage="Boundaries saved"
        onError={(error) => toastError(error, 'Failed to update boundaries')}
        onSuccess={() => router.replace(resourcePath)}
      />
    ) : (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="About">
          <OverviewText>
            {geometries.description ?? 'No description.'}
          </OverviewText>
        </OverviewSection>
      </div>
    )
  ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          geometries ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Boundaries"
              savePending={updateGeometries.isPending}
            />
          ) : null
        }
        breadcrumbs={<GeometriesBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={geometriesQuery.error}
        errorMessage="Failed to load boundaries"
        isLoading={geometriesQuery.isLoading}
        loadingMessage="Loading boundaries"
        notFoundMessage="Boundaries not found"
      >
        {geometries ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                {requiresOrganizationSwitch ? (
                  <ActiveOrganizationWriteWarning
                    visibility={geometries.visibility}
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
                                placeholder="Boundaries name"
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
                        currentVisibility={geometries.visibility}
                        isPending={
                          previewGeometriesVisibility.isPending ||
                          updateGeometriesVisibility.isPending
                        }
                        onPreviewChange={previewVisibilityChange}
                        options={visibilityOptions}
                      />
                    </div>
                  ) : (
                    <ResourceTitleBlock
                      title={geometries.name ?? 'Untitled boundaries'}
                      description={geometries.description ?? 'No description'}
                      visibility={geometries.visibility}
                    />
                  )}
                </div>

                <ResourcePageTabs
                  value={isEditMode ? 'overview' : activeTab}
                  onValueChange={setActiveTab}
                  hideTabs={isEditMode}
                  overview={overview}
                  exploreMap={
                    <>
                      <ChoroplethMapViewer
                        geometriesRun={geometries.mainRun}
                        className="h-96"
                        onGeometryOutputSelect={openGeometryOutputDetails}
                      />
                      <GeometryOutputDetailsSidebar
                        geometryOutputId={selectedGeometryOutputId}
                        onClose={closeGeometryOutputDetails}
                        open={Boolean(selectedGeometryOutputId)}
                      />
                    </>
                  }
                  exploreTable={
                    geometries.mainRunId ? (
                      <GeometriesMainRunOutputsTable
                        canEdit={canEdit}
                        geometriesRunId={geometries.mainRunId}
                      />
                    ) : undefined
                  }
                  lineage={
                    geometries.mainRun ? (
                      <WorkflowDagChart
                        workflowDag={geometries.mainRun.workflowDag}
                        runType="geometries"
                        isMainRoute
                      />
                    ) : undefined
                  }
                  workflowDagSimple={geometries.mainRun?.workflowDagSimple}
                  versions={<GeometriesRunFeature embedded />}
                  usage={
                    <ResourceUsageDetailCards
                      productCount={geometries.productCount}
                      productQuery={{ geometriesId: geometries.id }}
                      reportCount={geometries.reportCount}
                      dashboardCount={geometries.dashboardCount}
                      reportQuery={{ geometriesId: geometries.id }}
                      dashboardQuery={{ geometriesId: geometries.id }}
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
          confirmLoading={updateGeometriesVisibility.isPending}
          onConfirm={confirmVisibilityChange}
        />
      </ResourcePageState>
    </div>
  )
}

export default GeometriesDetails
