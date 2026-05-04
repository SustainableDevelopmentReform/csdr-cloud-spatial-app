'use client'

import { cn } from '@repo/ui/lib/utils'
import GeometriesMapViewer from '../../geometries/_components/geometries-map-viewer'
import { useGeometriesRun } from '../../geometries/_hooks'
import { useProductOutputsExport, useProductRun } from '../_hooks'

export const ProductExploreMap = ({
  productRunId,
  className,
}: {
  productRunId: string
  className?: string
}) => {
  const productRunQuery = useProductRun(productRunId)
  const productRun = productRunQuery.data

  const shouldFetchGeometriesRun = !!productRun?.geometriesRun?.id
  const geometriesRunQuery = useGeometriesRun(
    productRun?.geometriesRun?.id,
    shouldFetchGeometriesRun,
  )
  const geometriesRun = geometriesRunQuery.data

  const productOutputsQuery = useProductOutputsExport(productRunId)
  const productOutputs = productOutputsQuery.data

  const isLoading =
    productRunQuery.isPending ||
    productRunQuery.isFetching ||
    (shouldFetchGeometriesRun &&
      (geometriesRunQuery.isPending || geometriesRunQuery.isFetching)) ||
    (!!productRun &&
      (productOutputsQuery.isPending || productOutputsQuery.isFetching))

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex h-96 items-center justify-center rounded-lg border',
          className,
        )}
      >
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    )
  }

  if (!productRun || !geometriesRun) {
    return (
      <div
        className={cn(
          'flex h-96 items-center justify-center rounded-lg border',
          className,
        )}
      >
        <div className="text-sm text-muted-foreground">
          Map data is unavailable.
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-96 rounded-lg overflow-hidden', className)}>
      <GeometriesMapViewer
        geometriesRun={geometriesRun}
        productRun={productRun}
        productOutputs={productOutputs?.data}
      />
    </div>
  )
}
