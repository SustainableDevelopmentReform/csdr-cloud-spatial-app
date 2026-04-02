'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesRunSchema } from '@repo/schemas/crud'
import { FormItem, FormLabel } from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../../components/form/crud-form-action'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import { DetailCard } from '../../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { useProductRunsLink } from '../../../product/_hooks'
import GeometriesMapViewer from '../../_components/geometries-map-viewer'
import { GeometriesRunSummaryCard } from '../../_components/geometries-run-summary-card'
import {
  useDeleteGeometriesRun,
  useGeometriesRun,
  useGeometriesRunsLink,
  useGeometryRunOutputsLink,
  useSetGeometriesMainRun,
  useUpdateGeometriesRun,
} from '../../_hooks'

const GeometriesRunDetails = () => {
  const { data: geometriesRun } = useGeometriesRun()
  const updateGeometriesRun = useUpdateGeometriesRun()

  const geometriesRunsLink = useGeometriesRunsLink()
  const deleteGeometriesRun = useDeleteGeometriesRun(
    undefined,
    geometriesRun?.geometries
      ? geometriesRunsLink(geometriesRun?.geometries)
      : undefined,
  )

  const geometryRunOutputsLink = useGeometryRunOutputsLink()
  const productRunsLink = useProductRunsLink()

  const setGeometriesMainRun = useSetGeometriesMainRun(geometriesRun)

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the geometries',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setGeometriesMainRun,
        disabled: geometriesRun?.id === geometriesRun?.geometries.mainRunId,
      },
    ],
    [
      geometriesRun?.geometries.mainRunId,
      geometriesRun?.id,
      setGeometriesMainRun,
    ],
  )

  const form = useForm({
    resolver: zodResolver(updateGeometriesRunSchema),
  })

  useEffect(() => {
    if (geometriesRun) {
      form.reset(geometriesRun)
    }
  }, [geometriesRun, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="flex flex-col gap-4">
        <GeometriesMapViewer geometriesRun={geometriesRun} className="h-96" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GeometriesRunSummaryCard run={geometriesRun} />
          <div className="grid grid-cols-1 gap-4">
            {geometriesRun && (
              <DetailCard
                title={`${geometriesRun?.outputCount} ${pluralize(geometriesRun?.outputCount, 'output', 'outputs')}`}
                description="Geometry Outputs"
                actionText="Open"
                actionLink={geometryRunOutputsLink(geometriesRun)}
                actionIcon={<ArrowUpRightIcon />}
              />
            )}
            {geometriesRun && (
              <DetailCard
                title={`${geometriesRun?.productRunCount} ${pluralize(geometriesRun?.productRunCount, 'product run', 'product runs')}`}
                description="Used by Products Runs"
                actionText="Open"
                actionLink={productRunsLink(null, {
                  geometriesRunId: geometriesRun?.id,
                })}
                actionIcon={<ArrowUpRightIcon />}
              />
            )}
            {geometriesRun && (
              <ResourceUsageDetailCards
                reportCount={geometriesRun.reportCount}
                dashboardCount={geometriesRun.dashboardCount}
                reportQuery={{ geometriesRunId: geometriesRun.id }}
                dashboardQuery={{ geometriesRunId: geometriesRun.id }}
              />
            )}
          </div>
        </div>
      </div>

      <CrudForm
        form={form}
        mutation={updateGeometriesRun}
        deleteMutation={deleteGeometriesRun}
        entityName="Geometries Run"
        entityNamePlural="geometries runs"
        actions={formActions}
        hiddenFields={['visibility']}
        successMessage="Updated Geometries Run"
      >
        <CrudFormRunFields form={form} readOnlyFields={'all'} />
        <FormItem>
          <FormLabel>Data PMTiles URL</FormLabel>
          <Input
            disabled
            value={geometriesRun?.dataPmtilesUrl ?? ''}
            className="bg-gray-100"
          />
        </FormItem>
      </CrudForm>
    </div>
  )
}

export default GeometriesRunDetails
