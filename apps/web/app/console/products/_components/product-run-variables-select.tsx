import { FieldGroup } from '../../../../components/action'
import { useProductRun } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'
type ProductRunVariablesSelectProps = {
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

export const ProductRunVariablesSelect = ({
  productRunId,
  disabled,
  ...props
}: ProductRunVariablesSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  return (
    <FieldGroup
      title={`Select Variable${props.multiple ? '(s)' : ''}`}
      disabled={disabled}
    >
      {props.multiple ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={productRun?.outputSummary?.variables.map(
            (variable) => variable.variable,
          )}
          value={props.value ?? []}
          onSelect={props.onSelect}
          disabled={!productRun}
          multiple
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={productRun?.outputSummary?.variables.map(
            (variable) => variable.variable,
          )}
          value={props.value ?? null}
          onSelect={props.onSelect}
          disabled={!productRun}
        />
      )}
    </FieldGroup>
  )
}
