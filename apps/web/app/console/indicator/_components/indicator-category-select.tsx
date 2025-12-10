import { SelectWithSearchWithCreate } from '@repo/ui/components/ui/select-with-search-with-create'
import {
  IndicatorCategoryListItem,
  useCreateIndicatorCategory,
  useIndicatorCategories,
} from '../_hooks'

export const IndicatorCategorySelect = ({
  value,
  onChange,
}: {
  value: string | null | undefined
  onChange: (category: IndicatorCategoryListItem | null) => void
}) => {
  const { data: indicatorCategories } = useIndicatorCategories()
  const createIndicatorCategory = useCreateIndicatorCategory()

  return (
    <SelectWithSearchWithCreate
      options={indicatorCategories?.data}
      value={
        indicatorCategories?.data.find((category) => category.id === value) ??
        null
      }
      onChange={(value) => onChange(value)}
      placeholder="Root Category"
      onCreateOption={(input) => {
        createIndicatorCategory.mutate(
          {
            name: input,
          },
          {
            onSuccess: (indicatorCategory) => {
              onChange(indicatorCategory)
            },
          },
        )
      }}
      isClearable
    />
  )
}
