import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { formatDateTime } from '../../../../utils/date'
import { useProductRun } from '../_hooks'

export const ProductOutputTimeSelect = ({
  productRunId,
  value,
  onChange,
  disabled,
}: {
  productRunId: string | null | undefined
  value: string | null
  onChange: (timePoint: string | null) => void
  disabled?: boolean
}) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  return (
    <FieldGroup
      className="flex-1"
      title="Select Time Point"
      disabled={!!(!productRun || disabled)}
    >
      <SelectWithSearch
        options={productRun?.outputSummary?.timePoints?.map((timePoint) => ({
          id: timePoint,
          name: formatDateTime(timePoint),
        }))}
        value={value ?? null}
        onSelect={(value) => {
          onChange(value || null)
        }}
        onSearch={() => {}}
        disabled={!!(!productRun || disabled)}
      />
    </FieldGroup>
  )
}
