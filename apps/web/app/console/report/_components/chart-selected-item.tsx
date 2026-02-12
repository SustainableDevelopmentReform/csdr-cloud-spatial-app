import { SelectedDataPoint } from '@repo/plot/types'
import { EmptyCard } from '../../_components/empty-card'
import { ProductOutputDependenciesCard } from '../../product/_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../../product/_components/product-output-summary-card'
import {
  ProductOutputExportListItem,
  useProductOutput,
} from '../../product/_hooks'
import { RefObject, useCallback, useRef } from 'react'
import { useOnClickOutside } from 'usehooks-ts'

const SelectedPointDetails = ({
  productOutputId,
}: {
  productOutputId: string | undefined | null
}) => {
  const { data: productOutput } = useProductOutput(productOutputId ?? undefined)
  return (
    <div className="flex flex-row gap-4 h-full">
      {productOutput ? (
        <>
          <ProductOutputSummaryCard productOutput={productOutput} showLink />
          <ProductOutputDependenciesCard
            productOutput={productOutput}
            showProduct
            showProductRun
          />
        </>
      ) : (
        <EmptyCard description="Click on a data point to see the details" />
      )}
    </div>
  )
}

export const ChartSelectedItem = ({
  selectedDataPoint,
  onSelect,
}: {
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null
  onSelect: (
    selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null,
  ) => void
}) => {
  const divRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  useOnClickOutside(divRef as RefObject<HTMLElement>, handleClickOutside)

  // Use fixed positioning with viewport coordinates directly so the popup
  // isn't clipped by any ancestor's overflow.
  let top = 0
  let left = 0
  let transformX = '0'
  let transformY = '0'

  if (selectedDataPoint?.event) {
    const cx = selectedDataPoint.event.clientX ?? 0
    const cy = selectedDataPoint.event.clientY ?? 0

    top = cy
    left = cx

    // Show to the left of cursor if on the right half of the viewport
    if (cx > window.innerWidth / 2) {
      transformX = '-100%'
    }

    // Show above cursor if on the bottom half of the viewport
    if (cy > window.innerHeight / 2) {
      transformY = '-100%'
    }
  }

  return (
    <div
      ref={divRef}
      className="fixed z-50"
      style={{
        top,
        left,
        transform: `translate(${transformX}, ${transformY})`,
      }}
    >
      {selectedDataPoint?.dataPoint && (
        <SelectedPointDetails
          productOutputId={selectedDataPoint.dataPoint.id}
        />
      )}
    </div>
  )
}
