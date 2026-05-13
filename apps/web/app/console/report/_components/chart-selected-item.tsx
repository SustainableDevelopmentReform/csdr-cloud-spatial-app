'use client'

import type { SelectedDataPoint } from '@repo/plot/types'
import { workflowDagSimpleSchema } from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { formatDateTime } from '@repo/ui/lib/date'
import { cn } from '@repo/ui/lib/utils'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  XIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { withDataLibrarySource, withResourceSection } from '~/lib/paths'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { ProductButton } from '../../product/_components/product-button'
import {
  type ProductOutputExportListItem,
  useProductLink,
  useProductOutput,
  useProductRun,
} from '../../product/_hooks'

type ProductOutputData = ReturnType<typeof useProductOutput>['data']
type ProductRunData = ReturnType<typeof useProductRun>['data']

type ChartSelectedItemProps = {
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null
  onSelect: (
    selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null,
  ) => void
}

const formatOutputValue = (
  value: number | undefined | null,
  unit: string | undefined | null,
) => {
  const formattedValue =
    value?.toLocaleString(undefined, { maximumFractionDigits: 100 }) ?? 'null'

  return unit ? `${formattedValue} ${unit}` : formattedValue
}

const getSelectedLocation = (
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null,
  productOutput: ProductOutputData,
) =>
  productOutput?.geometryOutput?.name ??
  selectedDataPoint?.dataPoint?.geometryOutputName ??
  'Unknown location'

const getSelectedIndicatorName = (
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem> | null,
  productOutput: ProductOutputData,
) =>
  productOutput?.indicator?.name ??
  selectedDataPoint?.dataPoint?.indicatorName ??
  'Data value'

function SelectedPointCard({
  onClose,
  onOpenDetails,
  selectedDataPoint,
}: {
  onClose: () => void
  onOpenDetails: () => void
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem>
}) {
  const selectedProductOutputId = selectedDataPoint.dataPoint?.id
  const { data: productOutput } = useProductOutput(selectedProductOutputId)
  const value = productOutput?.value ?? selectedDataPoint.dataPoint?.value
  const location = getSelectedLocation(selectedDataPoint, productOutput)
  const indicatorName = getSelectedIndicatorName(
    selectedDataPoint,
    productOutput,
  )
  const unit = productOutput?.indicator?.unit

  return (
    <div className="relative w-56 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md">
      <Button
        aria-label="Close selected data point"
        className="absolute right-2 top-2 size-6 opacity-60 hover:opacity-100"
        onClick={onClose}
        size="icon"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-3.5" />
      </Button>
      <div className="space-y-1">
        <p className="truncate pr-6 text-sm text-muted-foreground">
          {location}
        </p>
        <p className="text-base font-semibold leading-6">
          {formatOutputValue(value, unit)}
        </p>
        <p className="line-clamp-2 text-sm leading-5">{indicatorName}</p>
        <div className="pt-1">
          <Button
            onClick={onOpenDetails}
            size="sm"
            type="button"
            variant="outline"
          >
            <InfoIcon className="size-4" />
            Data Details
          </Button>
        </div>
      </div>
    </div>
  )
}

function DataDetailsSection({
  children,
  defaultOpen = false,
  title,
}: {
  children: ReactNode
  defaultOpen?: boolean
  title: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="border-b border-border">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="pb-4 text-sm leading-5">{children}</div> : null}
    </section>
  )
}

function MethodDetails({
  isLoading,
  lineageHref,
  productRun,
}: {
  isLoading: boolean
  lineageHref: string | null
  productRun: ProductRunData
}) {
  const parsedWorkflowDagSimple = workflowDagSimpleSchema
    .nullable()
    .safeParse(productRun?.workflowDagSimple ?? null)
  const lineageLink = lineageHref ? (
    <Button asChild className="h-auto p-0 text-xs" type="button" variant="link">
      <Link href={lineageHref}>
        <ExternalLinkIcon className="size-3.5" />
        View full lineage
      </Link>
    </Button>
  ) : null

  if (isLoading) {
    return <p className="text-muted-foreground">Loading methods...</p>
  }

  if (
    !parsedWorkflowDagSimple.success ||
    !parsedWorkflowDagSimple.data ||
    parsedWorkflowDagSimple.data.methods.length === 0
  ) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">
          No method information available.
        </p>
        {lineageLink}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {parsedWorkflowDagSimple.data.methods.map((method) => (
          <Badge key={method} variant="outline" className="max-w-full">
            <span className="truncate">{method}</span>
          </Badge>
        ))}
      </div>
      {lineageLink}
    </div>
  )
}

function SourceDataDetails({
  productOutput,
}: {
  productOutput: ProductOutputData
}) {
  const product = productOutput?.productRun.product
  const dataset = productOutput?.productRun.datasetRun?.dataset
  const geometries = productOutput?.productRun.geometriesRun?.geometries

  if (!product && !dataset && !geometries) {
    return <p className="text-muted-foreground">No source data linked.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {product ? <ProductButton fromLibrary product={product} /> : null}
      {dataset ? <DatasetButton dataset={dataset} fromLibrary /> : null}
      {geometries ? (
        <GeometriesButton geometries={geometries} fromLibrary />
      ) : null}
    </div>
  )
}

function DataDetailsSidebar({
  onClose,
  open,
  productOutputId,
  refElement,
}: {
  onClose: () => void
  open: boolean
  productOutputId: string | null
  refElement: RefObject<HTMLDivElement | null>
}) {
  const { data: productOutput, isLoading } = useProductOutput(
    productOutputId ?? undefined,
  )
  const productRunId = productOutput?.productRun.id
  const { data: productRun, isLoading: isProductRunLoading } = useProductRun(
    productRunId,
    Boolean(productRunId),
  )
  const productLink = useProductLink()

  const location = getSelectedLocation(null, productOutput)
  const indicatorName = getSelectedIndicatorName(null, productOutput)
  const about =
    productOutput?.description ??
    productOutput?.indicator?.description ??
    'No description available for this data point.'
  const value = formatOutputValue(
    productOutput?.value,
    productOutput?.indicator?.unit,
  )
  const productHref = productOutput
    ? withDataLibrarySource(productLink(productOutput.productRun.product))
    : null
  const fullLineageHref = productHref
    ? withResourceSection(productHref, 'lineage', 'technical')
    : null

  if (!open) {
    return null
  }

  return (
    <aside
      ref={refElement}
      className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-full flex-col gap-5 overflow-hidden border-l border-border bg-white px-4 py-2 text-foreground shadow-md"
    >
      <div className="flex justify-end">
        <Button
          aria-label="Close data details"
          className="size-7 opacity-60 hover:opacity-100"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="space-y-5">
        <p className="text-sm font-medium text-muted-foreground">
          {indicatorName}
        </p>
        <h2 className="text-4xl font-bold leading-10 tracking-normal text-foreground">
          {isLoading ? 'Loading...' : value}
        </h2>
        <div className="space-y-0.5 text-base leading-6 text-muted-foreground">
          <p>Location: {location}</p>
          {productOutput?.timePoint ? (
            <p>Date: {formatDateTime(productOutput.timePoint)}</p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-hidden border-t border-border">
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DataDetailsSection defaultOpen title="About">
              <p className="text-muted-foreground">{about}</p>
            </DataDetailsSection>
            <DataDetailsSection title="Method">
              <MethodDetails
                isLoading={isProductRunLoading}
                lineageHref={fullLineageHref}
                productRun={productRun}
              />
            </DataDetailsSection>
            <DataDetailsSection title="Source data">
              <SourceDataDetails productOutput={productOutput} />
            </DataDetailsSection>
          </div>

          <div className="space-y-4 border-t border-border py-4">
            {productHref ? (
              <Button asChild className="w-full" type="button">
                <Link href={productHref}>
                  <ExternalLinkIcon className="size-4" />
                  Product Details
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}

export const ChartSelectedItem = ({
  selectedDataPoint,
  onSelect,
}: ChartSelectedItemProps) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsProductOutputId, setDetailsProductOutputId] = useState<
    string | null
  >(null)

  const selectedProductOutputId = selectedDataPoint?.dataPoint?.id ?? null
  const activeDetailsProductOutputId = detailsOpen
    ? (selectedProductOutputId ?? detailsProductOutputId)
    : detailsProductOutputId

  const closeDetails = useCallback(() => {
    setDetailsOpen(false)
    setDetailsProductOutputId(null)
    onSelect(null)
  }, [onSelect])

  useEffect(() => {
    if (!selectedDataPoint?.dataPoint || detailsOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (popoverRef.current?.contains(target)) {
        return
      }

      if (sidebarRef.current?.contains(target)) {
        return
      }

      onSelect(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [detailsOpen, onSelect, selectedDataPoint])

  useEffect(() => {
    if (!selectedDataPoint?.dataPoint && !detailsOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (detailsOpen) {
        closeDetails()
        return
      }

      onSelect(null)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDetails, detailsOpen, onSelect, selectedDataPoint])

  const openDetails = useCallback(() => {
    if (!selectedProductOutputId) {
      return
    }

    setDetailsProductOutputId(selectedProductOutputId)
    setDetailsOpen(true)
  }, [selectedProductOutputId])

  const popoverPosition = useMemo(() => {
    let top = 0
    let left = 0
    let transformX = '0'
    let transformY = '0'

    if (selectedDataPoint?.event && typeof window !== 'undefined') {
      const cx = selectedDataPoint.event.clientX ?? 0
      const cy = selectedDataPoint.event.clientY ?? 0

      top = cy
      left = cx

      if (cx > window.innerWidth / 2) {
        transformX = '-100%'
      }

      if (cy > window.innerHeight / 2) {
        transformY = '-100%'
      }
    }

    return {
      left,
      top,
      transform: `translate(${transformX}, ${transformY})`,
    }
  }, [selectedDataPoint])

  return (
    <>
      {selectedDataPoint?.dataPoint && !detailsOpen ? (
        <div ref={popoverRef} className="fixed z-50" style={popoverPosition}>
          <SelectedPointCard
            onClose={() => onSelect(null)}
            onOpenDetails={openDetails}
            selectedDataPoint={selectedDataPoint}
          />
        </div>
      ) : null}
      <DataDetailsSidebar
        onClose={closeDetails}
        open={detailsOpen && Boolean(activeDetailsProductOutputId)}
        productOutputId={activeDetailsProductOutputId}
        refElement={sidebarRef}
      />
    </>
  )
}
