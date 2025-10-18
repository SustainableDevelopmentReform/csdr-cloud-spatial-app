import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { useProductRun } from '../../products/_hooks'

type VariablesSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
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

export const VariablesSelect = ({
  productRunId,
  disabled,
  ...props
}: VariablesSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  return (
    <FieldGroup title="Select Variable" disabled={!productRun || disabled}>
      {props.multiple ? (
        <SelectWithSearch
          options={productRun?.outputSummary?.variables.map(
            (variable) => variable.variable,
          )}
          value={props.value ?? []}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun}
          multiple
        />
      ) : (
        <SelectWithSearch
          options={productRun?.outputSummary?.variables.map(
            (variable) => variable.variable,
          )}
          value={props.value ?? null}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun}
        />
      )}
    </FieldGroup>
  )
}
