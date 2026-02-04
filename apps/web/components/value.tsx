import { Badge } from '@repo/ui/components/ui/badge'
import { cn } from '@repo/ui/lib/utils'
import { useMemo } from 'react'
import { IndicatorListItem } from '../app/console/indicator/_hooks'

export const Value = ({
  value,
  indicator,
  large = false,
}: {
  value: number | undefined | null
  indicator?: IndicatorListItem | undefined | null
  large?: boolean
}) => {
  const formattedValue = useMemo(() => {
    return (
      value?.toLocaleString(undefined, { maximumFractionDigits: 100 }) ?? 'null'
    )
  }, [value])

  return (
    <Badge variant="value" className={cn('font-mono', large && 'text-lg')}>
      {formattedValue}
      {indicator?.unit && <span> {indicator.unit}</span>}
    </Badge>
  )
}
