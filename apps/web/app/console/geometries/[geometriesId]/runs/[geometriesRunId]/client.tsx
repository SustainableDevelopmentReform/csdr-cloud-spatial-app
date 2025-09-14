'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../components/crud-form'
import { CrudFormAction } from '../../../../../../components/crud-form-action'
import { DetailCard } from '../../../../_components/detail-cards'
import { useProductRunsLink } from '../../../../products/_hooks'
import { GeometriesRunSummaryCard } from '../../../_components/geometries-run-summary-card'
import {
  useDeleteGeometriesRun,
  useGeometries,
  useGeometriesRun,
  useGeometriesRunLink,
  useSetGeometriesMainRun,
  useUpdateGeometriesRun,
} from '../../../_hooks'

const GeometriesRunDetails = () => {
  const { data: geometriesRun } = useGeometriesRun()
  const updateGeometriesRun = useUpdateGeometriesRun()
  const deleteGeometriesRun = useDeleteGeometriesRun(
    undefined,
    '/console/geometriesRuns',
  )
  const geometriesRunLink = useGeometriesRunLink()
  const productRunsLink = useProductRunsLink()
  const { data: geometries } = useGeometries()

  const setGeometriesMainRun = useSetGeometriesMainRun(geometriesRun)

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the geometries',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setGeometriesMainRun,
      },
    ],
    [setGeometriesMainRun],
  )

  const form = useForm({
    resolver: zodResolver(baseFormSchema),
  })

  useEffect(() => {
    if (geometriesRun) {
      form.reset(geometriesRun)
    }
  }, [geometriesRun, form])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeometriesRunSummaryCard
          geometries={geometries}
          geometriesRun={geometriesRun}
        />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {geometriesRun && (
            <DetailCard
              title={`${geometriesRun?.outputCount} ${pluralize(geometriesRun?.outputCount, 'output', 'outputs')}`}
              description="Geometry Outputs"
              actionText="Open"
              actionLink={`${geometriesRunLink(geometriesRun)}/outputs`}
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
        </div>
      </div>

      <CrudForm
        form={form}
        mutation={updateGeometriesRun}
        deleteMutation={deleteGeometriesRun}
        entityName="Geometries Run"
        entityNamePlural="geometries runs"
        actions={formActions}
      />
    </div>
  )
}

export default GeometriesRunDetails
