import { SelectedDataPoint } from '@repo/plot/types'
import { EmptyCard } from '../../_components/empty-card'
import { ProductOutputDependenciesCard } from '../../product/_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../../product/_components/product-output-summary-card'
import {
  ProductOutputExportListItem,
  useProductOutput,
} from '../../product/_hooks'
import { RefObject, useCallback, useEffect, useRef } from 'react'
import { useOnClickOutside } from 'usehooks-ts'

const SelectedPointDetails = ({
  productOutputId,
}: {
  productOutputId: string | undefined | null
}) => {
  const { data: productOutput } = useProductOutput(productOutputId ?? undefined)
  return (
    <div className="flex flex-col gap-4 h-full">
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
  const positionedParentRef = useRef<HTMLElement | null>(null)

  const handleClickOutside = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  useOnClickOutside(divRef as RefObject<HTMLElement>, handleClickOutside)

  useEffect(() => {
    if (!divRef.current) {
      return
    }

    // Find the nearest positioned parent element once on mount
    let parent = divRef.current.parentElement
    while (parent) {
      const position = window.getComputedStyle(parent).position
      if (
        position === 'relative' ||
        position === 'absolute' ||
        position === 'fixed' ||
        position === 'sticky'
      ) {
        // Found the positioned parent, store the reference
        positionedParentRef.current = parent
        return
      }
      parent = parent.parentElement
    }

    // No positioned parent found
    positionedParentRef.current = null
  }, [])

  // Calculate relative position based on the current mouse event and parent position
  let top = 0
  let left = 0
  let transformX = '0'
  let transformY = '0'

  if (selectedDataPoint?.event) {
    top = selectedDataPoint.event.clientY ?? 0
    left = selectedDataPoint.event.clientX ?? 0

    if (positionedParentRef.current) {
      const parentRect = positionedParentRef.current.getBoundingClientRect()
      top = top - parentRect.top
      left = left - parentRect.left

      // If on the right side of the screen, move the tooltip to the left
      if (selectedDataPoint.event.clientX > window.innerWidth / 2) {
        transformX = '-100%'
      }

      // If on the bottom side of the screen, move the tooltip to the top
      if (selectedDataPoint.event.clientY > window.innerHeight / 2) {
        transformY = '-100%'
      }
    }
  }

  return (
    <div
      ref={divRef}
      className="absolute z-10"
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
