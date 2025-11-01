import { useMemo } from 'react'
import { MultiValue, SingleValue } from 'react-select'
import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { VariableListItem } from '../../variable/_hooks'
import { useProductRun } from '../_hooks'

type ProductRunVariablesSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
} & (
  | {
      value: string[]
      onChange: (value: MultiValue<VariableListItem>) => void
      isMulti: true
    }
  | {
      value: string | null
      onChange: (value: SingleValue<VariableListItem>) => void
      isMulti?: false
    }
)

export const ProductRunVariablesSelect = ({
  productRunId,
  disabled,
  value,
  onChange,
  isMulti,
  ...props
}: ProductRunVariablesSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)

  const options = useMemo(() => {
    return productRun?.outputSummary?.variables.map(
      (variable) => variable.variable,
    )
  }, [productRun])

  const discriminatedProps = useMemo(() => {
    if (isMulti === true) {
      const selectedValues =
        options?.filter((variable) => value.includes(variable.id)) ?? []
      return {
        isMulti: true,
        value: selectedValues,
        onChange: (nextValue: MultiValue<VariableListItem>) =>
          onChange(nextValue),
      } as const
    }
    const selectedValue =
      options?.find((variable) => variable.id === value) ?? null
    return {
      isMulti: false,
      value: selectedValue,
      onChange: (nextValue: SingleValue<VariableListItem>) =>
        onChange(nextValue),
    } as const
  }, [isMulti, options, value, onChange])

  return (
    <FieldGroup
      title={`Select Variable${discriminatedProps.isMulti ? '(s)' : ''}`}
      disabled={disabled}
    >
      {discriminatedProps.isMulti ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={options}
          value={discriminatedProps.value}
          onChange={discriminatedProps.onChange}
          isDisabled={!productRun}
          isMulti
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={options}
          value={discriminatedProps.value}
          onChange={discriminatedProps.onChange}
          isDisabled={!productRun}
          isClearable
        />
      )}
    </FieldGroup>
  )
}
