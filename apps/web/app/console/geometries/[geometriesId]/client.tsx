'use client'

import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { baseFormSchema, CrudForm } from '../../../../components/crud-form'
import { DetailCard } from '../../_components/detail-cards'
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
  const deleteGeometries = useDeleteGeometries('/console/geometries')
  const geometriesRunsLink = useGeometriesRunsLink()

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeometriesRunSummaryCard geometries={geometries} />
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
        </div>
      </div>
      {geometries && (
        <CrudForm
          data={geometries}
          defaultValues={{
            name: geometries?.name,
            description: geometries?.description ?? undefined,
            metadata: geometries?.metadata ?? undefined,
          }}
          formSchema={baseFormSchema}
          updateMutation={updateGeometries}
          deleteMutation={deleteGeometries}
        />
      )}
    </div>
  )
}

export default GeometriesDetails
