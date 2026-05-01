'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import {
  CrudFormAction,
  FormAction,
} from '../../../../components/form/crud-form-action'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { GEOMETRIES_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { DetailCard } from '../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import { ResourcePageTabs } from '../../_components/resource-page-tabs'
import { SourcesCard } from '../../_components/sources-card'
import { useProductsLink } from '../../product/_hooks'
import GeometriesMapViewer from '../_components/geometries-map-viewer'
import { GeometriesMainRunOutputsTable } from '../_components/geometries-main-run-outputs-table'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import GeometriesRunFeature from './runs/client'
import {
  useDeleteGeometries,
  useGeometries,
  useGeometriesRunsLink,
  usePreviewGeometriesVisibility,
  useUpdateGeometries,
  useUpdateGeometriesVisibility,
} from '../_hooks'

const GeometriesDetails = () => {
  const geometriesQuery = useGeometries()
  const geometries = geometriesQuery.data
  const productsLink = useProductsLink()
  const updateGeometries = useUpdateGeometries()
  const updateGeometriesVisibility = useUpdateGeometriesVisibility()
  const previewGeometriesVisibility = usePreviewGeometriesVisibility()
  const deleteGeometries = useDeleteGeometries(undefined, GEOMETRIES_BASE_PATH)
  const geometriesRunsLink = useGeometriesRunsLink()
  const { access } = useAccessControl()
  const canEdit = canEditConsoleResource({
    access,
    resource: 'geometries',
    createdByUserId: getCreatedByUserId(geometries),
    resourceData: geometries,
  })
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(geometries),
      resource: 'geometries',
      resourceData: geometries,
    })

  const form = useForm({
    resolver: zodResolver(updateGeometriesSchema),
  })

  useEffect(() => {
    if (geometries) {
      form.reset(geometries)
    }
  }, [geometries, form])

  const formActions: CrudFormAction[] = useMemo(() => {
    const actions: CrudFormAction[] = []

    if (geometries) {
      const visibilityAction = createResourceVisibilityAction({
        access,
        mutation: updateGeometriesVisibility,
        previewMutation: previewGeometriesVisibility,
        resourceData: geometries,
        successMessage: 'Geometries visibility updated',
        visibility: geometries.visibility,
      })

      if (visibilityAction) {
        actions.push(visibilityAction)
      }
    }

    if (canEdit) {
      actions.push({
        title: 'Delete Geometries',
        description:
          'Permanently remove the geometries, including all dependents.',
        buttonVariant: 'destructive',
        buttonTitle: 'Delete',
        mutation: deleteGeometries,
        confirmDialog: {
          title: 'Are you sure?',
          description: `This action cannot be undone. This will permanently delete ${geometries?.name ?? 'this'} geometries and remove all dependents.`,
          buttonCancelTitle: 'Cancel',
        },
      })
    }

    return actions
  }, [
    access,
    canEdit,
    deleteGeometries,
    geometries,
    previewGeometriesVisibility,
    updateGeometriesVisibility,
  ])

  return (
    <ResourcePageState
      error={geometriesQuery.error}
      errorMessage="Failed to load geometries"
      isLoading={geometriesQuery.isLoading}
      loadingMessage="Loading geometries"
      notFoundMessage="Geometries not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col">
        {requiresOrganizationSwitch ? (
          <ActiveOrganizationWriteWarning visibility={geometries?.visibility} />
        ) : null}
        <ResourcePageTabs
          overview={
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {geometries && (
                  <DetailCard
                    title={`${geometries?.runCount} ${pluralize(geometries?.runCount, 'run', 'runs')}`}
                    description="Geometries Runs"
                    actionText="Open"
                    actionLink={geometriesRunsLink(geometries)}
                    actionIcon={<ArrowUpRightIcon />}
                  />
                )}
                {geometries && (
                  <DetailCard
                    title={`${geometries?.productCount} ${pluralize(geometries?.productCount, 'product', 'products')}`}
                    description="Products"
                    actionText="Open"
                    actionLink={productsLink({ geometriesId: geometries.id })}
                    actionIcon={<ArrowUpRightIcon />}
                  />
                )}
              </div>
              {geometries && <SourcesCard resource={geometries} />}
              <CrudForm
                form={form}
                mutation={updateGeometries}
                actions={[]}
                entityName="Geometries"
                entityNamePlural="geometries sets"
                readOnly={!canEdit}
                successMessage="Updated Geometries"
              />
            </>
          }
          exploreMap={
            <GeometriesMapViewer
              geometriesRun={geometries?.mainRun}
              className="h-96"
            />
          }
          exploreTable={
            geometries?.mainRunId ? (
              <GeometriesMainRunOutputsTable
                geometriesRunId={geometries.mainRunId}
              />
            ) : undefined
          }
          lineage={
            geometries?.mainRun ? (
              <WorkflowDagChart
                workflowDag={geometries.mainRun.workflowDag}
                runType="geometries"
                isMainRoute
              />
            ) : undefined
          }
          versions={<GeometriesRunFeature />}
          usage={
            geometries ? (
              <ResourceUsageDetailCards
                reportCount={geometries.reportCount}
                dashboardCount={geometries.dashboardCount}
                reportQuery={{ geometriesId: geometries.id }}
                dashboardQuery={{ geometriesId: geometries.id }}
              />
            ) : undefined
          }
          actions={
            geometries ? (
              <>
                {formActions.map((action, i) => (
                  <FormAction key={i} {...action} />
                ))}
              </>
            ) : undefined
          }
        />
      </div>
    </ResourcePageState>
  )
}

export default GeometriesDetails
