import { FieldGroup } from '../../../../components/form/action'
import { formatDateTime } from '@repo/ui/lib/date'
import { useProductRun } from '../_hooks'
import {
  SelectOption,
  SelectWithSearch,
  MultiValue,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { useMemo } from 'react'

type ProductOutputTimeSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
  isClearable?: boolean
  disabledTimePoints?: readonly string[]
  disabledTimePointReason?: string
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

type TimePointOption = SelectOption & {
  isDisabled: boolean
}

function toTimePointOption({
  timePoint,
  disabledTimePoints,
  disabledTimePointReason,
}: {
  timePoint: string
  disabledTimePoints: readonly string[]
  disabledTimePointReason: string | undefined
}): TimePointOption {
  const isDisabled = disabledTimePoints.includes(timePoint)
  const label = formatDateTime(timePoint)
  return {
    id: timePoint,
    name:
      isDisabled && disabledTimePointReason
        ? `${label} (${disabledTimePointReason})`
        : label,
    isDisabled,
  }
}

export const ProductOutputTimeSelect = (
  props: ProductOutputTimeSelectProps,
) => {
  const {
    productRunId,
    disabled,
    disabledTimePoints = [],
    disabledTimePointReason,
    isClearable = true,
  } = props
  const { data: productRun } = useProductRun(productRunId ?? undefined)

  const options = useMemo(() => {
    return productRun?.outputSummary?.timePoints?.map((timePoint) =>
      toTimePointOption({
        timePoint,
        disabledTimePoints,
        disabledTimePointReason,
      }),
    )
  }, [disabledTimePointReason, disabledTimePoints, productRun])

  const isOptionDisabled = (option: TimePointOption) => option.isDisabled

  return (
    <FieldGroup
      className="flex-1"
      title={`Select Time Point${props.isMulti === true ? '(s)' : ''}`}
      disabled={!!(!productRun || disabled)}
    >
      {props.isMulti === true ? (
        <SelectWithSearch<TimePointOption, true>
          placeholder={props.placeholder}
          options={options}
          value={props.value.map((timePoint) =>
            toTimePointOption({
              timePoint,
              disabledTimePoints,
              disabledTimePointReason,
            }),
          )}
          onChange={(nextValue: MultiValue<TimePointOption>) =>
            props.onChange(nextValue.map((value) => value.id))
          }
          isDisabled={!productRun || disabled}
          isOptionDisabled={isOptionDisabled}
          isMulti
        />
      ) : (
        <SelectWithSearch<TimePointOption, false>
          placeholder={props.placeholder}
          options={options}
          value={
            props.value
              ? toTimePointOption({
                  timePoint: props.value,
                  disabledTimePoints,
                  disabledTimePointReason,
                })
              : null
          }
          onChange={(nextValue: SingleValue<TimePointOption> | null) =>
            props.onChange(nextValue?.id ?? null)
          }
          isDisabled={!productRun || disabled}
          isOptionDisabled={isOptionDisabled}
          isClearable={isClearable}
        />
      )}
    </FieldGroup>
  )
}
