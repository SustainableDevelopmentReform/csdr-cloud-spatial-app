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
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import BaseCrudTable from '../../../../components/table/crud-table'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
import {
  ProductRunDetail,
  useAssignDerivedIndicatorToProductRun,
  useComputeDerivedIndicatorsForProductRun,
  useRemoveDerivedIndicatorFromProductRun,
} from '../_hooks'

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

  const assignDerivedIndicator = useAssignDerivedIndicatorToProductRun(run?.id)
  const removeDerivedIndicator = useRemoveDerivedIndicatorFromProductRun(
    run?.id,
  )
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

  const handleRemove = useCallback(
    (derivedIndicatorId: string) => {
      removeDerivedIndicator.mutate(
        { derivedIndicatorId },
        {
          onSuccess: () => {
            toast.success('Derived indicator removed')
          },
          onError: (error) => {
            toast.error(getErrorMessage(error))
          },
        },
      )
    },
    [removeDerivedIndicator],
  )

  const columns = useMemo<ColumnDef<DerivedIndicatorItem>[]>(
    () => [
      {
        id: 'delete',
        header: () => <span className="sr-only">Delete</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(row.original.id)}
              disabled={removeDerivedIndicator.isPending}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [handleRemove, removeDerivedIndicator.isPending],
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span>
          <Button variant="outline" disabled={!run?.id}>
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
            {assignedIndicators.length ? (
              <div className="overflow-hidden rounded-md border">
                <BaseCrudTable
                  data={assignedIndicatorItems}
                  baseColumns={[]}
                  extraColumns={columns}
                  title="Derived Indicator"
                  itemButton={(indicator) => (
                    <IndicatorButton indicator={indicator} />
                  )}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No derived indicators assigned.
              </p>
            )}
          </div>
        </div>
        <div>
          <Button
            onClick={() =>
              computeDerivedIndicatorsForProductRun.mutate(undefined, {
                onSuccess: (response) => {
                  if (response?.data.warnings?.length) {
                    toast.warning(
                      'Derived indicators computed with warnings - see console for details',
                      {
                        description: response.data.warnings
                          .map((warning) => warning.message)
                          .join(', '),
                      },
                    )
                    console.warn(response?.data.warnings)
                  } else {
                    toast.success('Derived indicators computed')
                  }
                },
                onError: (error) => {
                  toast.error(getErrorMessage(error))
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
      </DialogContent>
    </Dialog>
  )
}
