import { FieldGroup } from '../../../../components/action'
import { useVariables } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'
type VariablesSelectProps = {
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

export const VariablesSelect = ({
  disabled,
  ...props
}: VariablesSelectProps) => {
  const { data: variables } = useVariables({ disablePagination: true })
  return (
    <FieldGroup
      title={`Select Variable${props.multiple ? '(s)' : ''}`}
      disabled={disabled}
    >
      {props.multiple ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={variables?.data}
          value={props.value ?? []}
          onSelect={props.onSelect}
          disabled={!variables}
          multiple
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={variables?.data}
          value={props.value ?? null}
          onSelect={props.onSelect}
          disabled={!variables}
        />
      )}
    </FieldGroup>
  )
}
