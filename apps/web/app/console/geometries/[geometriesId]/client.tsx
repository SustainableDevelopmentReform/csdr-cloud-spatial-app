'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import { useAccessControl } from '../../../../hooks/useAccessControl'
import { GEOMETRIES_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { DetailCard } from '../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import { SourcesCard } from '../../_components/sources-card'
import { useProductsLink } from '../../product/_hooks'
import GeometriesMapViewer from '../_components/geometries-map-viewer'
import { GeometriesRunSummaryCard } from '../_components/geometries-run-summary-card'
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

  const form = useForm({
    resolver: zodResolver(updateGeometriesSchema),
  })

  useEffect(() => {
    if (geometries) {
      form.reset(geometries)
    }
  }, [geometries, form])

  const formActions = useMemo(() => {
    if (!geometries) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateGeometriesVisibility,
      previewMutation: previewGeometriesVisibility,
      resourceData: geometries,
      successMessage: 'Geometries visibility updated',
      visibility: geometries.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [
    access,
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
        <div className="flex flex-col gap-4">
          <GeometriesMapViewer
            geometriesRun={geometries?.mainRun}
            className="h-96"
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GeometriesRunSummaryCard run={geometries?.mainRun} mainRun />
            <div className="grid grid-cols-1 gap-4">
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
              {geometries && <SourcesCard resource={geometries} />}
              {geometries && (
                <ResourceUsageDetailCards
                  reportCount={geometries.reportCount}
                  dashboardCount={geometries.dashboardCount}
                  reportQuery={{ geometriesId: geometries.id }}
                  dashboardQuery={{ geometriesId: geometries.id }}
                />
              )}
            </div>
          </div>
        </div>
        <CrudForm
          form={form}
          mutation={updateGeometries}
          deleteMutation={deleteGeometries}
          actions={formActions}
          entityName="Geometries"
          entityNamePlural="geometries sets"
          readOnly={!canEdit}
          successMessage="Updated Geometries"
        />
      </div>
    </ResourcePageState>
  )
}

export default GeometriesDetails
