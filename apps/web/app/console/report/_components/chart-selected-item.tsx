'use client'

import type { SelectedDataPoint } from '@repo/plot/types'
import { deriveRunStatus, workflowDagSimpleSchema } from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { formatDateTime } from '@repo/ui/lib/date'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { withDataLibrarySource, withResourceSection } from '~/lib/paths'
import { Value } from '../../../../components/value'
import {
  ConsoleSideDrawer,
  ConsoleSideDrawerSection,
  useConsoleSideDrawerStack,
} from '../../_components/console-side-drawer'
import { VersionStatusBadge } from '../../_components/version-status-badge'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { GeometryOutputButton } from '../../geometries/_components/geometry-output-button'
import { GeometryOutputDetailsSidebar } from '../../geometries/_components/geometry-output-details-sidebar'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { useDerivedIndicator } from '../../indicator/_hooks'
import { ProductButton } from '../../product/_components/product-button'
import { ProductRunButton } from '../../product/_components/product-run-button'
import {
  type ProductOutputExportListItem,
  useProduct,
  useProductLink,
  useProductOutput,
  useProductRun,
} from '../../product/_hooks'

type ProductOutputData = ReturnType<typeof useProductOutput>['data']
type ProductRunData = ReturnType<typeof useProductRun>['data']
type DerivedIndicatorData = ReturnType<typeof useDerivedIndicator>['data']

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

type TimeChangeSelectionMode = 'delta' | 'percentDelta'

function getSelectedPointMetadata(
  dataPoint: ProductOutputExportListItem | null | undefined,
  key: string,
): unknown {
  return dataPoint ? Reflect.get(dataPoint, key) : undefined
}

function getSelectedPointNumber(
  dataPoint: ProductOutputExportListItem | null | undefined,
  key: string,
): number | undefined {
  const value = getSelectedPointMetadata(dataPoint, key)
  return typeof value === 'number' ? value : undefined
}

function getSelectedPointString(
  dataPoint: ProductOutputExportListItem | null | undefined,
  key: string,
): string | undefined {
  const value = getSelectedPointMetadata(dataPoint, key)
  return typeof value === 'string' ? value : undefined
}

function getSelectedPointTime(
  dataPoint: ProductOutputExportListItem | null | undefined,
  key: string,
): Date | string | undefined {
  const value = getSelectedPointMetadata(dataPoint, key)
  return value instanceof Date || typeof value === 'string' ? value : undefined
}

function getTimeChangeMode(
  dataPoint: ProductOutputExportListItem | null | undefined,
): TimeChangeSelectionMode | null {
  const value = getSelectedPointMetadata(dataPoint, 'timeChangeMode')
  return value === 'delta' || value === 'percentDelta' ? value : null
}

function formatSelectedValue({
  mode,
  unit,
  value,
}: {
  mode: TimeChangeSelectionMode | null
  unit: string | undefined | null
  value: number | undefined | null
}) {
  if (mode === 'percentDelta') {
    const formattedValue =
      value?.toLocaleString(undefined, { maximumFractionDigits: 100 }) ?? 'null'
    return `${formattedValue}%`
  }
  return formatOutputValue(value, unit)
}

function DerivedCalculationDetails({
  derivedIndicator,
  isLoading,
  onGeometryOutputSelect,
  onProductOutputSelect,
  productOutput,
}: {
  derivedIndicator: DerivedIndicatorData
  isLoading: boolean
  onGeometryOutputSelect?: (geometryOutputId: string) => void
  onProductOutputSelect?: (productOutputId: string) => void
  productOutput: ProductOutputData
}) {
  const { pushActiveDrawerSnapshot } = useConsoleSideDrawerStack()
  const productOutputIndicator = productOutput?.indicator
  const fallbackFormula =
    productOutputIndicator?.type === 'derived'
      ? productOutputIndicator.expression
      : undefined
  const formula = derivedIndicator?.expression ?? fallbackFormula
  const dependencyIndicators = derivedIndicator?.indicators ?? []
  const dependencyProductOutputs = productOutput?.dependencyProductOutputs ?? []

  if (isLoading) {
    return <p className="text-muted-foreground">Loading calculation...</p>
  }

  if (!derivedIndicator) {
    return (
      <p className="text-muted-foreground">
        No calculation information available.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Formula
        </p>
        <pre className="max-w-full overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs leading-5 text-foreground">
          {formula ?? 'No formula recorded.'}
        </pre>
        {dependencyIndicators.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {dependencyIndicators.map((indicator, index) => (
              <Badge key={indicator.id} variant="secondary">
                ${index + 1} = {indicator.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Dependencies
        </p>
        {dependencyIndicators.length > 0 ? (
          dependencyIndicators.map((indicator) => {
            const dependencyProductOutput = dependencyProductOutputs.find(
              (dependency) => dependency.indicator?.id === indicator.id,
            )
            const dependencyGeometryOutput =
              dependencyProductOutput?.geometryOutput

            return (
              <div
                className="space-y-3 rounded-md border border-border bg-background p-3"
                key={indicator.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <IndicatorButton indicator={indicator} />
                    </div>
                  </div>
                  {dependencyProductOutput && onProductOutputSelect ? (
                    <Button
                      className="h-[22px] shrink-0 px-2 py-0 text-xs leading-4 shadow-none [&_svg]:size-3.5"
                      onClick={() => {
                        pushActiveDrawerSnapshot()
                        onProductOutputSelect(dependencyProductOutput.id)
                      }}
                      size="sm"
                      type="button"
                    >
                      View
                      <ExternalLinkIcon />
                    </Button>
                  ) : null}
                </div>

                {dependencyProductOutput ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        Value
                      </span>
                      <Value
                        value={dependencyProductOutput.value}
                        indicator={dependencyProductOutput.indicator}
                      />
                    </div>
                    {dependencyGeometryOutput ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          Location
                        </span>
                        <GeometryOutputButton
                          geometryOutput={dependencyGeometryOutput}
                          onClick={
                            onGeometryOutputSelect
                              ? () =>
                                  onGeometryOutputSelect(
                                    dependencyGeometryOutput.id,
                                  )
                              : undefined
                          }
                        />
                      </div>
                    ) : null}
                    <p>
                      Time point:{' '}
                      {formatDateTime(dependencyProductOutput.timePoint)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <ProductButton
                        fromLibrary
                        product={dependencyProductOutput.productRun.product}
                      />
                      <ProductRunButton
                        productRun={dependencyProductOutput.productRun}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No product output found for this dependency.
                  </p>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-muted-foreground">
            No dependency indicators recorded.
          </p>
        )}
      </div>
    </div>
  )
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
  onOpenDetails: (_productOutputId: string | null | undefined) => void
  selectedDataPoint: SelectedDataPoint<ProductOutputExportListItem>
}) {
  const selectedProductOutputId = selectedDataPoint.dataPoint?.id
  const mode = getTimeChangeMode(selectedDataPoint.dataPoint)
  const baselineProductOutputId = getSelectedPointString(
    selectedDataPoint.dataPoint,
    'baselineProductOutputId',
  )
  const { data: productOutput } = useProductOutput(selectedProductOutputId)
  const { data: baselineProductOutput } = useProductOutput(
    baselineProductOutputId,
  )
  const transformedValue =
    getSelectedPointNumber(selectedDataPoint.dataPoint, 'transformedValue') ??
    selectedDataPoint.dataPoint?.value
  const rawValue =
    getSelectedPointNumber(selectedDataPoint.dataPoint, 'rawValue') ??
    productOutput?.value ??
    selectedDataPoint.dataPoint?.value
  const baselineValue =
    baselineProductOutput?.value ??
    getSelectedPointNumber(selectedDataPoint.dataPoint, 'baselineValue')
  const value = mode ? transformedValue : rawValue
  const location = getSelectedLocation(selectedDataPoint, productOutput)
  const indicatorName = getSelectedIndicatorName(
    selectedDataPoint,
    productOutput,
  )
  const unit = productOutput?.indicator?.unit
  const baselineTimePoint =
    baselineProductOutput?.timePoint ??
    getSelectedPointTime(selectedDataPoint.dataPoint, 'baselineTimePoint')
  const currentTimePoint =
    productOutput?.timePoint ?? selectedDataPoint.dataPoint?.timePoint
  const sourceRows = mode
    ? [
        {
          id: baselineProductOutputId,
          label: 'Previous',
          timePoint: baselineTimePoint,
          value: baselineValue,
        },
        {
          id: selectedProductOutputId,
          label: 'Current',
          timePoint: currentTimePoint,
          value: rawValue,
        },
      ]
    : []

  return (
    <div className="relative w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md">
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
          {formatSelectedValue({ mode, value, unit })}
        </p>
        <p className="line-clamp-2 text-sm leading-5">{indicatorName}</p>
        {!mode && selectedProductOutputId ? (
          <div className="pt-1">
            <Button
              onClick={() => onOpenDetails(selectedProductOutputId)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ExternalLinkIcon className="size-4" />
              Data Details
            </Button>
          </div>
        ) : null}
        {mode ? (
          <div className="space-y-2 pt-2">
            {sourceRows.map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="text-sm font-medium">
                      {formatOutputValue(row.value, unit)}
                    </p>
                    {row.timePoint ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(row.timePoint)}
                      </p>
                    ) : null}
                  </div>
                  {row.id ? (
                    <Button
                      className="h-7 px-2 text-xs"
                      onClick={() => onOpenDetails(row.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Details
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
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

export function ProductOutputDetailsSidebar({
  onClose,
  onGeometryOutputSelect,
  onProductOutputSelect,
  open,
  productOutputId,
  refElement,
}: {
  onClose: () => void
  onGeometryOutputSelect?: (geometryOutputId: string) => void
  onProductOutputSelect?: (productOutputId: string) => void
  open: boolean
  productOutputId: string | null
  refElement?: RefObject<HTMLElement | null>
}) {
  const { data: productOutput, isLoading } = useProductOutput(
    productOutputId ?? undefined,
  )
  const productRunId = productOutput?.productRun.id
  const { data: productRun, isLoading: isProductRunLoading } = useProductRun(
    productRunId,
    Boolean(productRunId),
  )
  const productId = productOutput?.productRun.product.id
  const { data: product } = useProduct(productId, Boolean(productId))
  const productLink = useProductLink()
  const derivedIndicatorId =
    productOutput?.indicator?.type === 'derived'
      ? productOutput.indicator.id
      : undefined
  const { data: derivedIndicator, isLoading: isDerivedIndicatorLoading } =
    useDerivedIndicator(derivedIndicatorId)

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
  const outputProductRun = productRun ?? productOutput?.productRun
  const runStatus = outputProductRun
    ? deriveRunStatus({
        latestRunCreatedAt: product?.mainRun?.createdAt,
        latestRunId: outputProductRun.product.mainRunId,
        runCreatedAt: productRun?.createdAt,
        runId: outputProductRun.id,
      })
    : null
  const versionStatusBadge = runStatus ? (
    <VersionStatusBadge status={runStatus} />
  ) : null
  const fullLineageHref = productHref
    ? withResourceSection(productHref, 'lineage', 'technical')
    : null
  const geometryOutput = productOutput?.geometryOutput

  return (
    <ConsoleSideDrawer
      badge={versionStatusBadge}
      closeLabel="Close data details"
      description={
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span>Location:</span>
            {geometryOutput ? (
              <GeometryOutputButton
                geometryOutput={geometryOutput}
                onClick={
                  onGeometryOutputSelect
                    ? () => onGeometryOutputSelect(geometryOutput.id)
                    : undefined
                }
              />
            ) : (
              <span>{location}</span>
            )}
          </div>
          {productOutput?.timePoint ? (
            <p>Date: {formatDateTime(productOutput.timePoint)}</p>
          ) : null}
        </div>
      }
      drawerRef={refElement}
      footer={
        productHref ? (
          <Button asChild className="w-full" type="button">
            <Link href={productHref}>
              <ExternalLinkIcon className="size-4" />
              Product Details
            </Link>
          </Button>
        ) : null
      }
      onClose={onClose}
      onBackRestore={
        productOutputId && onProductOutputSelect
          ? () => onProductOutputSelect(productOutputId)
          : undefined
      }
      open={open}
      tagline={indicatorName}
      title={isLoading ? 'Loading...' : value}
    >
      <div className="border-t border-border">
        <ConsoleSideDrawerSection defaultOpen title="About">
          <p className="text-muted-foreground">{about}</p>
        </ConsoleSideDrawerSection>
        {derivedIndicatorId ? (
          <ConsoleSideDrawerSection defaultOpen title="Calculation">
            <DerivedCalculationDetails
              derivedIndicator={derivedIndicator}
              isLoading={isDerivedIndicatorLoading}
              onGeometryOutputSelect={onGeometryOutputSelect}
              onProductOutputSelect={onProductOutputSelect}
              productOutput={productOutput}
            />
          </ConsoleSideDrawerSection>
        ) : null}
        <ConsoleSideDrawerSection title="Method">
          <MethodDetails
            isLoading={isProductRunLoading}
            lineageHref={fullLineageHref}
            productRun={productRun}
          />
        </ConsoleSideDrawerSection>
        <ConsoleSideDrawerSection title="Source data">
          <SourceDataDetails productOutput={productOutput} />
        </ConsoleSideDrawerSection>
      </div>
    </ConsoleSideDrawer>
  )
}

export const ChartSelectedItem = ({
  selectedDataPoint,
  onSelect,
}: ChartSelectedItemProps) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsProductOutputId, setDetailsProductOutputId] = useState<
    string | null
  >(null)
  const [detailsGeometryOutputId, setDetailsGeometryOutputId] = useState<
    string | null
  >(null)

  const selectedProductOutputId = selectedDataPoint?.dataPoint?.id ?? null
  const activeDetailsProductOutputId = detailsOpen
    ? (detailsProductOutputId ?? selectedProductOutputId)
    : detailsProductOutputId

  const closeDetails = useCallback(() => {
    setDetailsOpen(false)
    setDetailsProductOutputId(null)
    setDetailsGeometryOutputId(null)
    onSelect(null)
  }, [onSelect])

  const closeGeometryDetails = useCallback(() => {
    setDetailsGeometryOutputId(null)
  }, [])

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

  const openDetails = useCallback(
    (productOutputId: string | null | undefined) => {
      const resolvedProductOutputId = productOutputId ?? selectedProductOutputId
      if (!resolvedProductOutputId) {
        return
      }

      setDetailsGeometryOutputId(null)
      setDetailsProductOutputId(resolvedProductOutputId)
      setDetailsOpen(true)
    },
    [selectedProductOutputId],
  )

  const selectDetailsProductOutput = useCallback(
    (productOutputId: string) => {
      setDetailsGeometryOutputId(null)
      setDetailsProductOutputId(productOutputId)
      setDetailsOpen(true)
      onSelect(null)
    },
    [onSelect],
  )

  const selectDetailsGeometryOutput = useCallback(
    (geometryOutputId: string) => {
      setDetailsGeometryOutputId(geometryOutputId)
      onSelect(null)
    },
    [onSelect],
  )

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
      {selectedDataPoint?.dataPoint ? (
        <div ref={popoverRef} className="fixed z-50" style={popoverPosition}>
          <SelectedPointCard
            onClose={() => onSelect(null)}
            onOpenDetails={openDetails}
            selectedDataPoint={selectedDataPoint}
          />
        </div>
      ) : null}
      <ProductOutputDetailsSidebar
        onClose={closeDetails}
        onGeometryOutputSelect={selectDetailsGeometryOutput}
        onProductOutputSelect={selectDetailsProductOutput}
        open={detailsOpen && Boolean(activeDetailsProductOutputId)}
        productOutputId={activeDetailsProductOutputId}
        refElement={sidebarRef}
      />
      <GeometryOutputDetailsSidebar
        geometryOutputId={detailsGeometryOutputId}
        onClose={closeGeometryDetails}
        onGeometryOutputSelect={selectDetailsGeometryOutput}
        open={Boolean(detailsGeometryOutputId)}
        openSource="drawer"
      />
    </>
  )
}
