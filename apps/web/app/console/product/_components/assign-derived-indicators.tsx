'use client'

import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import { toast } from '@repo/ui/components/ui/sonner'
import { StatusMessage } from '../../../../components/status-message'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
import { IndicatorListItem, useDerivedIndicator } from '../../indicator/_hooks'
import {
  ProductRunAssignedDerivedIndicator,
  ProductRunDetail,
  useAssignDerivedIndicatorToProductRun,
  useComputeDerivedIndicatorsForProductRun,
  useDeleteAssignedDerivedIndicator,
  useProductRun,
  useProductRunDerivedIndicators,
  useProductRunOutputsLink,
} from '../_hooks'
import { FieldGroup } from '../../../../components/form/action'
import { ProductSelect } from './product-select'
import { ProductRunSelect } from './product-run-select'
import { RefreshProductSummary } from './refresh-product-summary'

import { Trash2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import { BadgeLink } from '../../../../components/badge-link'
import { Value } from '../../../../components/value'

type DerivedIndicatorItem =
  ProductRunAssignedDerivedIndicator['derivedIndicator']

type DependencyMapping = {
  indicatorId: string
  productId: string | null
  sourceProductRunId: string | null
}

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return 'Failed to update derived indicators'
}

const DependencyMappingRow = ({
  indicator,
  defaultProductId,
  defaultProductRunId,
  currentGeometriesRunId,
  onChange,
}: {
  indicator: IndicatorListItem
  defaultProductId: string | null
  defaultProductRunId: string | null
  currentGeometriesRunId: string | null | undefined
  onChange: (productId: string | null, productRunId: string | null) => void
}) => {
  const [productId, setProductId] = useState<string | null>(defaultProductId)
  const [productRunId, setProductRunId] = useState<string | null>(
    defaultProductRunId,
  )

  // Fetch the selected product run to check geometriesRunId
  const { data: selectedProductRun } = useProductRun(productRunId ?? undefined)

  // Check if geometries run differs from current
  const hasDifferentGeometriesRun = useMemo(() => {
    if (!selectedProductRun || !currentGeometriesRunId) return false
    return selectedProductRun.geometriesRun?.id !== currentGeometriesRunId
  }, [selectedProductRun, currentGeometriesRunId])

  // Find the indicator summary in the selected product run's output summary
  const indicatorSummary = useMemo(() => {
    if (!selectedProductRun?.outputSummary?.indicators) return null
    return selectedProductRun.outputSummary.indicators.find(
      (i) => i.indicator?.id === indicator.id,
    )
  }, [selectedProductRun, indicator.id])

  // Initialize with defaults
  useEffect(() => {
    setProductId(defaultProductId)
    setProductRunId(defaultProductRunId)
  }, [defaultProductId, defaultProductRunId])

  const handleProductChange = useCallback(
    (product: { id: string } | null) => {
      const newProductId = product?.id ?? null
      setProductId(newProductId)
      // Reset product run when product changes
      setProductRunId(null)
      onChange(newProductId, null)
    },
    [onChange],
  )

  const handleProductRunChange = useCallback(
    (productRun: { id: string } | null) => {
      const newProductRunId = productRun?.id ?? null
      setProductRunId(newProductRunId)
      onChange(productId, newProductRunId)
    },
    [onChange, productId],
  )

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <IndicatorButton indicator={indicator} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ProductSelect
          value={productId}
          onChange={handleProductChange}
          isClearable
        />
        <ProductRunSelect
          value={productRunId}
          productId={productId}
          onChange={handleProductRunChange}
          disabled={!productId}
          isClearable
        />
      </div>
      {hasDifferentGeometriesRun && (
        <StatusMessage variant="warning">
          This product run uses a different geometries run. Geometry output IDs
          must match for derived indicators to compute correctly.
        </StatusMessage>
      )}
      {selectedProductRun && !indicatorSummary && (
        <StatusMessage variant="warning">
          This product run has no output values for this indicator.
        </StatusMessage>
      )}
      {indicatorSummary && (
        <StatusMessage variant="primary">
          {indicatorSummary.count} outputs - Data range:
          {<Value value={indicatorSummary.minValue} indicator={indicator} />} to
          {<Value value={indicatorSummary.maxValue} indicator={indicator} />} -
          Mean:
          {<Value value={indicatorSummary.avgValue} indicator={indicator} />}
        </StatusMessage>
      )}
    </div>
  )
}

export const AssignDerivedIndicatorsDialog = ({
  run,
}: {
  run?: ProductRunDetail | null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    null,
  )
  const [dependencyMappings, setDependencyMappings] = useState<
    DependencyMapping[]
  >([])
  const [warnings, setWarnings] = useState<
    { message: string; description?: string }[]
  >([])

  // Fetch the full derived indicator with its dependency indicators
  const { data: selectedDerivedIndicator, isLoading: isLoadingIndicator } =
    useDerivedIndicator(selectedIndicatorId ?? undefined)

  const productRunOutputsLink = useProductRunOutputsLink()

  // Get default product and product run from the current run
  const defaultProductId = run?.product?.id ?? null
  const defaultProductRunId = run?.id ?? null

  // Initialize dependency mappings when derived indicator is selected
  useEffect(() => {
    if (selectedDerivedIndicator?.indicators) {
      setDependencyMappings(
        selectedDerivedIndicator.indicators.map((indicator) => ({
          indicatorId: indicator.id,
          productId: defaultProductId,
          sourceProductRunId: defaultProductRunId,
        })),
      )
    } else {
      setDependencyMappings([])
    }
  }, [selectedDerivedIndicator, defaultProductId, defaultProductRunId])

  const assignDerivedIndicator = useAssignDerivedIndicatorToProductRun(run?.id)
  const deleteAssignedDerivedIndicator = useDeleteAssignedDerivedIndicator(
    run?.id,
  )

  const computeDerivedIndicatorsForProductRun =
    useComputeDerivedIndicatorsForProductRun(run)

  // Fetch assigned derived indicators separately
  const { data: assignedIndicators } = useProductRunDerivedIndicators(run?.id)

  const assignedIndicatorIds = useMemo(
    () =>
      new Set(
        (assignedIndicators ?? []).map(
          (assignedIndicator) => assignedIndicator.derivedIndicator.id,
        ),
      ),
    [assignedIndicators],
  )

  const handleDeleteAssignedIndicator = (assignmentId: string) => {
    deleteAssignedDerivedIndicator.mutate(assignmentId, {
      onSuccess: () => {
        toast.success('Derived indicator removed')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    })
  }

  // Check if all dependencies have been mapped
  const allDependenciesMapped = useMemo(() => {
    if (!selectedDerivedIndicator?.indicators?.length) return false
    return dependencyMappings.every((mapping) => mapping.sourceProductRunId)
  }, [selectedDerivedIndicator, dependencyMappings])

  const isAssignDisabled =
    !run?.id ||
    !selectedIndicatorId ||
    assignedIndicatorIds.has(selectedIndicatorId) ||
    !allDependenciesMapped ||
    assignDerivedIndicator.isPending

  const handleDependencyMappingChange = useCallback(
    (
      indicatorId: string,
      productId: string | null,
      productRunId: string | null,
    ) => {
      setDependencyMappings((prev) =>
        prev.map((mapping) =>
          mapping.indicatorId === indicatorId
            ? { ...mapping, productId, sourceProductRunId: productRunId }
            : mapping,
        ),
      )
    },
    [],
  )

  const handleAssign = () => {
    if (!selectedIndicatorId || !run?.id || !allDependenciesMapped) return

    assignDerivedIndicator.mutate(
      {
        derivedIndicatorId: selectedIndicatorId,
        dependencies: dependencyMappings
          .filter((m) => m.sourceProductRunId)
          .map((m) => ({
            indicatorId: m.indicatorId,
            sourceProductRunId: m.sourceProductRunId!,
          })),
      },
      {
        onSuccess: () => {
          setSelectedIndicatorId(null)
          setDependencyMappings([])
          toast.success('Derived indicator assigned')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span>
          <Button
            disabled={!run?.id}
            className="bg-indicator text-indicator-foreground hover:bg-indicator/70"
          >
            Assign Derived Indicators
          </Button>
        </span>
      </DialogTrigger>
      <DialogContent className="w-[900px] max-w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Derived Indicators</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 px-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              1
            </span>
            <span className="text-primary">Assign derived indicator</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              2
            </span>
            <span className="text-primary">Compute derived indicators</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              3
            </span>
            <span className="text-primary">Refresh run summary</span>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-3">
            <IndicatorsSelect
              title="Select Derived Indicator"
              description="Select the derived indicator to assign to the product run."
              value={selectedIndicatorId}
              onChange={(indicator) => {
                setSelectedIndicatorId(indicator?.id ?? null)
              }}
              queryOptions={{ type: 'derived' }}
            />

            {selectedIndicatorId && (
              <div className="grid gap-3">
                <FieldGroup
                  title="Map Dependency Indicators"
                  description="For each dependency indicator, select the product and product run to source the data from."
                >
                  {isLoadingIndicator ? (
                    <div className="text-sm text-muted-foreground">
                      Loading indicator dependencies...
                    </div>
                  ) : selectedDerivedIndicator?.indicators?.length ? (
                    <div className="grid gap-3">
                      {selectedDerivedIndicator.indicators.map((indicator) => (
                        <DependencyMappingRow
                          key={indicator.id}
                          indicator={indicator}
                          defaultProductId={defaultProductId}
                          defaultProductRunId={defaultProductRunId}
                          currentGeometriesRunId={run?.geometriesRun?.id}
                          onChange={(productId, productRunId) =>
                            handleDependencyMappingChange(
                              indicator.id,
                              productId,
                              productRunId,
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      This derived indicator has no dependency indicators.
                    </div>
                  )}
                </FieldGroup>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleAssign} disabled={isAssignDisabled}>
                {assignDerivedIndicator.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="text-sm font-medium">Assigned indicators</div>
          {assignedIndicators?.length && run ? (
            <div className="border rounded-md divide-y">
              {assignedIndicators.map((assigned) => {
                const outputSummaryIndicator =
                  run?.outputSummary?.indicators?.find(
                    (indicator) =>
                      indicator.indicator?.id === assigned.derivedIndicator.id,
                  )
                return (
                  <div
                    key={assigned.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <IndicatorButton indicator={assigned.derivedIndicator} />
                      <BadgeLink
                        href={productRunOutputsLink(run, {
                          indicatorId: assigned.derivedIndicator.id,
                        })}
                        variant="outline"
                      >
                        {outputSummaryIndicator?.count ?? 'See'} outputs
                      </BadgeLink>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={
                            !!outputSummaryIndicator ||
                            deleteAssignedDerivedIndicator.isPending
                          }
                          onClick={() =>
                            handleDeleteAssignedIndicator(assigned.id)
                          }
                          title={
                            outputSummaryIndicator
                              ? 'Cannot delete - indicator exists in output summary'
                              : 'Delete assigned indicator'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        hidden={!outputSummaryIndicator}
                      >
                        Cannot delete - indicator exists in output summary
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No derived indicators assigned.
            </p>
          )}
        </div>
        <div>
          <FieldGroup
            title="Compute Derived Indicators"
            description="After assigning derived indicators, you can compute them for the product run. Existing computed derived indicators will be skipped."
          >
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  computeDerivedIndicatorsForProductRun.mutate(undefined, {
                    onSuccess: (response) => {
                      const warningMessages = response?.data.warnings ?? []

                      setWarnings(warningMessages)
                      if (warningMessages.length) {
                        toast.warning(
                          'Derived indicators computed with warnings - see console for details',
                        )
                        console.warn(warningMessages)
                      } else {
                        toast.success('Derived indicators computed')
                      }
                    },
                    onError: (error) => {
                      toast.error(getErrorMessage(error))
                      setWarnings([])
                    },
                  })
                }
                disabled={computeDerivedIndicatorsForProductRun.isPending}
              >
                {computeDerivedIndicatorsForProductRun.isPending
                  ? 'Computing...'
                  : 'Compute'}
              </Button>
            </div>
          </FieldGroup>
        </div>
        {warnings.length > 0 && (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Warnings</div>

            <ul className="list-disc pl-5 text-sm text-amber-600 space-y-1">
              {warnings.map((warning, index) => (
                <div key={`${warning.message}-${index}`}>
                  <span>{warning.message}</span>
                  {warning.description && (
                    <span className="text-amber-400 pl-2">
                      {warning.description}
                    </span>
                  )}
                </div>
              ))}
            </ul>
          </div>
        )}
        <div>
          <FieldGroup
            title="Refresh Run Summary"
            description={
              <span>
                After computing derived indicators, refresh the product run
                summary to update the indicators and outputs.
                <br />
                <b>
                  Note, a derived indicator cannot be removed after it has been
                  added to the run output summary.
                </b>
              </span>
            }
          >
            <div className="flex justify-end">
              <RefreshProductSummary run={run} />
            </div>
          </FieldGroup>
        </div>
      </DialogContent>
    </Dialog>
  )
}
