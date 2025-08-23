'use client'

import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../components/crud-form'
import { DetailCard } from '../../../../_components/detail-cards'
import { MainRunBadge } from '../../../../_components/main-run-badge'
import { useProductRunsLink } from '../../../../products/_hooks'
import { GeometriesRunSummaryCard } from '../../../_components/geometries-run-summary-card'
import {
  useDeleteGeometriesRun,
  useGeometries,
  useGeometriesRun,
  useGeometriesRunLink,
  useUpdateGeometriesRun,
} from '../../../_hooks'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'

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
      />
    </div>
  )
}

export default GeometriesRunDetails
