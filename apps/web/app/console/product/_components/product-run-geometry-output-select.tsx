import { FieldGroup } from '../../../../components/form/action'
import { useGeometryOutputs } from '../../geometries/_hooks'
import { useProductRun } from '../_hooks'
import {
  SelectWithSearch,
  MultiValue,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { GeometryOutputListItem } from '../../geometries/_hooks'
import { useMemo } from 'react'

type ProductGeometryOutputSelectProps = {
  title?: string
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
  isClearable?: boolean
} & (
  | {
      isMulti: true
      value: string[]
      onChange: (value: MultiValue<GeometryOutputListItem>) => void
    }
  | {
      isMulti?: false
      value: string | null
      onChange: (value: SingleValue<GeometryOutputListItem>) => void
    }
)

export const ProductGeometryOutputSelect = ({
  title,
  productRunId,
  disabled,
  value,
  onChange,
  isMulti,
  isClearable = true,
  ...props
}: ProductGeometryOutputSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  const geometryOutputsQuery =
    isMulti === true ? { excludeGeometryOutputIds: value } : {}
  const {
    data: geometryOutputs,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingGeometryOutputs,
    isFetchingNextPage,
  } = useGeometryOutputs(productRun?.geometriesRun?.id, geometryOutputsQuery)

  const hasSelectedValue = Array.isArray(value) ? value.length > 0 : !!value

  const {
    data: selectedGeometryOutputs,
    isLoading: isLoadingSelectedGeometryOutputs,
  } = useGeometryOutputs(
    productRun?.geometriesRun?.id,
    {
      geometryOutputIds: value ?? undefined,
      size: Array.isArray(value) ? value.length : value ? 1 : undefined,
    },
    false,
    hasSelectedValue,
  )

  const discriminatedProps = useMemo(() => {
    if (isMulti === true) {
      const selectedValues = hasSelectedValue
        ? (selectedGeometryOutputs?.data ?? [])
        : []
      return {
        isMulti: true,
        value: selectedValues,
        onChange: (nextValue: MultiValue<GeometryOutputListItem>) =>
          onChange(nextValue),
      } as const
    }
    const selectedValue = hasSelectedValue
      ? (selectedGeometryOutputs?.data?.[0] ?? null)
      : null
    return {
      isMulti: false,
      value: selectedValue,
      onChange: (nextValue: SingleValue<GeometryOutputListItem>) =>
        onChange(nextValue),
    } as const
  }, [isMulti, hasSelectedValue, selectedGeometryOutputs?.data, onChange])

  return (
    <FieldGroup
      title={
        title ?? `Select Geometry${discriminatedProps.isMulti ? '(s)' : ''}`
      }
      disabled={disabled}
    >
      {discriminatedProps.isMulti === true ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={geometryOutputs?.data}
          value={discriminatedProps.value}
          onChange={discriminatedProps.onChange}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          isDisabled={!productRun || disabled}
          isLoading={
            isLoadingGeometryOutputs ||
            isLoadingSelectedGeometryOutputs ||
            isFetchingNextPage
          }
          isClearable={isClearable}
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isMulti
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={geometryOutputs?.data}
          value={discriminatedProps.value ?? null}
          onChange={discriminatedProps.onChange}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          isDisabled={!productRun || disabled}
          isClearable={isClearable}
          isLoading={
            isLoadingGeometryOutputs ||
            isLoadingSelectedGeometryOutputs ||
            isFetchingNextPage
          }
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
        />
      )}
    </FieldGroup>
  )
}
