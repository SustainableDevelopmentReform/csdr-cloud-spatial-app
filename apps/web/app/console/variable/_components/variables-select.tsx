import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { VariableListItem, useVariable, useVariables } from '../_hooks'

export const VariablesSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (variable: VariableListItem | null) => void
  disabled?: boolean
}) => {
  const { data: variables, setSearchParams } = useVariables()

  const { data: selectedVariable } = useVariable(value ?? undefined)

  return (
    <FieldGroup title="Select Variable" disabled={disabled}>
      <SelectWithSearch
        options={variables?.data}
        value={selectedVariable ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
      />
    </FieldGroup>
  )
}
