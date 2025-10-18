import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { formatDateTime } from '../../../../utils/date'
import { useProductRun } from '../_hooks'

type ProductOutputTimeSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
} & (
  | {
      value: string[]
      onSelect: (value: string[]) => void
      multiple: true
    }
  | {
      value: string | null
      onSelect: (value: string | null) => void
      multiple?: false
    }
)

export const ProductOutputTimeSelect = ({
  productRunId,
  disabled,
  ...props
}: ProductOutputTimeSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  return (
    <FieldGroup
      className="flex-1"
      title={`Select Time Point${props.multiple ? '(s)' : ''}`}
      disabled={!!(!productRun || disabled)}
    >
      {props.multiple ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={productRun?.outputSummary?.timePoints?.map((timePoint) => ({
            id: timePoint,
            name: formatDateTime(timePoint),
          }))}
          value={props.value ?? []}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun || disabled}
          multiple
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={productRun?.outputSummary?.timePoints?.map((timePoint) => ({
            id: timePoint,
            name: formatDateTime(timePoint),
          }))}
          value={props.value ?? null}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun || disabled}
        />
      )}
    </FieldGroup>
  )
}
