import { useMemo } from 'react'
import {
  MultiValue,
  SingleValue,
  SelectWithSearch,
} from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/form/action'
import { IndicatorListItem } from '../../indicator/_hooks'
import { useProductRun } from '../_hooks'

type ProductRunIndicatorsSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
  isClearable?: boolean
} & (
  | {
      value: string[]
      onChange: (value: MultiValue<IndicatorListItem>) => void
      isMulti: true
    }
  | {
      value: string | null
      onChange: (value: SingleValue<IndicatorListItem>) => void
      isMulti?: false
    }
)

export const ProductRunIndicatorsSelect = ({
  productRunId,
  disabled,
  value,
  onChange,
  isMulti,
  isClearable = true,
  ...props
}: ProductRunIndicatorsSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)

  const options = useMemo(() => {
    return productRun?.outputSummary?.indicators
      .map((indicator) => indicator.indicator)
      .filter((indicator): indicator is IndicatorListItem => !!indicator)
  }, [productRun])

  const discriminatedProps = useMemo(() => {
    if (isMulti === true) {
      const selectedValues =
        options?.filter((indicator) => value.includes(indicator.id)) ?? []
      return {
        isMulti: true,
        value: selectedValues,
        onChange: (nextValue: MultiValue<IndicatorListItem>) =>
          onChange(nextValue),
      } as const
    }
    const selectedValue =
      options?.find((indicator) => indicator.id === value) ?? null
    return {
      isMulti: false,
      value: selectedValue,
      onChange: (nextValue: SingleValue<IndicatorListItem>) =>
        onChange(nextValue),
    } as const
  }, [isMulti, options, value, onChange])

  return (
    <FieldGroup
      title={`Select Indicator${discriminatedProps.isMulti ? '(s)' : ''}`}
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
          isClearable={isClearable}
        />
      )}
    </FieldGroup>
  )
}
