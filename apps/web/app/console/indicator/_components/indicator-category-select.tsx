import {
  MultiValue,
  SelectWithSearch,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { SelectWithSearchWithCreate } from '@repo/ui/components/ui/select-with-search-with-create'
import {
  IndicatorCategoryListItem,
  useCreateIndicatorCategory,
  useIndicatorCategories,
} from '../_hooks'
import { useMemo } from 'react'

type IndicatorCategorySelectProps =
  | {
      value: string[]
      onChange: (categories: MultiValue<IndicatorCategoryListItem>) => void
      disabled?: boolean
      isMulti: true
      isClearable?: boolean
      placeholder?: string
    }
  | {
      value: string | null | undefined
      onChange: (category: SingleValue<IndicatorCategoryListItem>) => void
      disabled?: boolean
      isMulti?: false
      isClearable?: boolean
      placeholder?: string
    }

export const IndicatorCategorySelect = (
  props: IndicatorCategorySelectProps,
) => {
  const { isClearable = true, placeholder } = props
  const { data: indicatorCategories } = useIndicatorCategories()
  const createIndicatorCategory = useCreateIndicatorCategory()
  const selectedMultiValue = useMemo(() => {
    if (props.isMulti !== true || !indicatorCategories?.data) {
      return []
    }

    const selectedIds = props.value ?? []
    const byId = new Map(
      indicatorCategories.data.map((category) => [category.id, category]),
    )
    return selectedIds
      .map((id) => byId.get(id))
      .filter((category): category is IndicatorCategoryListItem => !!category)
  }, [indicatorCategories?.data, props])
  const selectedSingleValue = useMemo(() => {
    if (props.isMulti === true || !indicatorCategories?.data) {
      return null
    }
    return (
      indicatorCategories.data.find(
        (category) => category.id === props.value,
      ) ?? null
    )
  }, [indicatorCategories?.data, props])

  if (props.isMulti === true) {
    return (
      <SelectWithSearch
        options={indicatorCategories?.data}
        value={selectedMultiValue}
        onChange={(value) => props.onChange(value)}
        placeholder={placeholder ?? 'Filter by category'}
        isClearable={isClearable}
        isMulti
        isDisabled={props.disabled}
      />
    )
  }

  return (
    <SelectWithSearchWithCreate
      options={indicatorCategories?.data}
      value={selectedSingleValue}
      onChange={(value) => props.onChange(value)}
      placeholder={placeholder ?? 'Root Category'}
      onCreateOption={(input) => {
        createIndicatorCategory.mutate(
          {
            name: input,
          },
          {
            onSuccess: (indicatorCategory) => {
              props.onChange(indicatorCategory)
            },
          },
        )
      }}
      isClearable={isClearable}
      isDisabled={props.disabled}
    />
  )
}
