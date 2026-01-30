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
import { useMemo, useState } from 'react'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
import {
  ProductRunDetail,
  useAssignDerivedIndicatorToProductRun,
  useComputeDerivedIndicatorsForProductRun,
} from '../_hooks'
import { FieldGroup } from '../../../../components/form/action'

type DerivedIndicatorItem = NonNullable<
  ProductRunDetail['assignedDerivedIndicators']
>[number]['derivedIndicator']

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

export const AssignDerivedIndicatorsDialog = ({
  run,
}: {
  run?: ProductRunDetail | null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    null,
  )
  const [warnings, setWarnings] = useState<string[]>([])

  const assignDerivedIndicator = useAssignDerivedIndicatorToProductRun(run?.id)

  const computeDerivedIndicatorsForProductRun =
    useComputeDerivedIndicatorsForProductRun(run)
  const assignedIndicators = useMemo(
    () => run?.assignedDerivedIndicators ?? [],
    [run?.assignedDerivedIndicators],
  )
  const assignedIndicatorIds = useMemo(
    () =>
      new Set(
        assignedIndicators.map(
          (assignedIndicator) => assignedIndicator.derivedIndicator.id,
        ),
      ),
    [assignedIndicators],
  )
  const assignedIndicatorItems = useMemo<DerivedIndicatorItem[]>(
    () =>
      assignedIndicators.map(
        (assignedIndicator) => assignedIndicator.derivedIndicator,
      ),
    [assignedIndicators],
  )

  const isAssignDisabled =
    !run?.id ||
    !selectedIndicatorId ||
    assignedIndicatorIds.has(selectedIndicatorId) ||
    assignDerivedIndicator.isPending

  const handleAssign = () => {
    if (!selectedIndicatorId || !run?.id) return

    assignDerivedIndicator.mutate(
      { derivedIndicatorId: selectedIndicatorId },
      {
        onSuccess: () => {
          setSelectedIndicatorId(null)
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
      <DialogContent className="w-[800px] max-w-full">
        <DialogHeader>
          <DialogTitle>Assign Derived Indicators</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-3">
            <IndicatorsSelect
              title="Select Derived Indicator"
              description="Select the derived indicator to assign to the product run. This cannot be removed after assignment."
              value={selectedIndicatorId}
              onChange={(indicator) =>
                setSelectedIndicatorId(indicator?.id ?? null)
              }
              queryOptions={{ type: 'derived' }}
            />
            <div className="flex justify-end">
              <Button onClick={handleAssign} disabled={isAssignDisabled}>
                {assignDerivedIndicator.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-medium">Assigned indicators</div>
            {assignedIndicatorItems.length ? (
              <div className="flex flex-wrap gap-2">
                {assignedIndicatorItems.map((indicator) => (
                  <IndicatorButton indicator={indicator} key={indicator.id} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No derived indicators assigned.
              </p>
            )}
          </div>
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
                      const warningMessages =
                        response?.data.warnings?.map(
                          (warning) => warning.message,
                        ) ?? []
                      setWarnings(warningMessages)
                      if (warningMessages.length) {
                        toast.warning(
                          'Derived indicators computed with warnings - see console for details',
                        )
                        console.warn(response?.data.warnings)
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
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
