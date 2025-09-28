'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometriesSchema } from '@repo/server/schemas/zod'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { DetailCard } from '../../_components/detail-cards'
import { SourcesCard } from '../../_components/sources-card'
import { useProductsLink } from '../../products/_hooks'
import { GeometriesRunSummaryCard } from '../_components/geometries-run-summary-card'
import {
  useDeleteGeometries,
  useGeometries,
  useGeometriesRunsLink,
  useUpdateGeometries,
} from '../_hooks'

const GeometriesDetails = () => {
  const { data: geometries } = useGeometries()
  const productsLink = useProductsLink()
  const updateGeometries = useUpdateGeometries()
  const deleteGeometries = useDeleteGeometries(undefined, '/console/geometries')
  const geometriesRunsLink = useGeometriesRunsLink()

  const form = useForm({
    resolver: zodResolver(updateGeometriesSchema),
  })

  useEffect(() => {
    if (geometries) {
      form.reset(geometries)
    }
  }, [geometries, form])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeometriesRunSummaryCard run={geometries?.mainRun} mainRun />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
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
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateGeometries}
        deleteMutation={deleteGeometries}
        entityName="Geometries"
        entityNamePlural="geometries sets"
      />
    </div>
  )
}

export default GeometriesDetails
