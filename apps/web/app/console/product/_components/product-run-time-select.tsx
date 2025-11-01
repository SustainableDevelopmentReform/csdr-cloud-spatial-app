import { FieldGroup } from '../../../../components/form/action'
import { formatDateTime } from '../../../../utils/date'
import { useProductRun } from '../_hooks'
import {
  SelectOption,
  SelectWithSearch,
} from '../../../../components/form/select-with-search'
import { useMemo } from 'react'
import { MultiValue, SingleValue } from 'react-select'
type ProductOutputTimeSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
} & (
  | {
      value: string[]
      onChange: (value: string[]) => void
      isMulti: true
    }
  | {
      value: string | null
      onChange: (value: string | null) => void
      isMulti?: false
    }
)

export const ProductOutputTimeSelect = ({
  productRunId,
  disabled,
  value,
  onChange,
  isMulti,
  ...props
}: ProductOutputTimeSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)

  const options = useMemo(() => {
    return productRun?.outputSummary?.timePoints?.map((timePoint) => ({
      id: timePoint,
      name: formatDateTime(timePoint),
    }))
  }, [productRun])

  const discriminatedProps = useMemo(() => {
    if (isMulti === true) {
      const values = value.map((timePoint) => ({
        id: timePoint,
        name: formatDateTime(timePoint),
      }))
      return {
        isMulti: true,
        value: values,
        onChange: (nextValue: MultiValue<SelectOption>) =>
          onChange(nextValue.map((value) => value.id)),
      } as const
    }
    return {
      isMulti: false,
      value: value ? { id: value, name: formatDateTime(value) } : null,
      onChange: (nextValue: SingleValue<SelectOption> | null) =>
        onChange(nextValue?.id ?? null),
    } as const
  }, [value, isMulti, onChange])

  return (
    <FieldGroup
      className="flex-1"
      title={`Select Time Point${discriminatedProps.isMulti ? '(s)' : ''}`}
      disabled={!!(!productRun || disabled)}
    >
      {discriminatedProps.isMulti ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={options}
          value={discriminatedProps.value}
          onChange={discriminatedProps.onChange}
          isDisabled={!productRun || disabled}
          isMulti
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={options}
          value={discriminatedProps.value ?? null}
          onChange={discriminatedProps.onChange}
          isDisabled={!productRun || disabled}
          isClearable
        />
      )}
    </FieldGroup>
  )
}
