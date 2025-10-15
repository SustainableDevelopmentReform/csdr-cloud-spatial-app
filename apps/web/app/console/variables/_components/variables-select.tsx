import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { useProductRun } from '../../products/_hooks'
import { VariableListItem } from '../_hooks'

export const VariablesSelect = ({
  productRunId,
  value,
  onChange,
  disabled,
}: {
  productRunId: string | null | undefined
  value: string | null | undefined
  onChange: (id: string | null, variable: VariableListItem | null) => void
  disabled?: boolean
}) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  return (
    <FieldGroup title="Select Variable" disabled={!productRun || disabled}>
      <SelectWithSearch
        options={productRun?.outputSummary?.variables.map(
          (variable) => variable.variable,
        )}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            productRun?.outputSummary?.variables.find(
              (variable) => variable.variable.id === value,
            )?.variable ?? null,
          )
        }}
        onSearch={() => {}}
        disabled={!productRun}
      />
    </FieldGroup>
  )
}
