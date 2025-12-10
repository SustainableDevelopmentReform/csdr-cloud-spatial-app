import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { SelectWithSearchWithCreate } from '@repo/ui/components/ui/select-with-search-with-create'
import {
  IndicatorListItem,
  useCreateIndicator,
  useIndicator,
  useIndicators,
} from '../_hooks'

export const IndicatorsSelect = ({
  value,
  onChange,
  isDisabled,
  isClearable,
  placeholder,
  creatable,
}: {
  value: string | null | undefined
  onChange: (indicator: IndicatorListItem | null) => void
  isDisabled?: boolean
  isClearable?: boolean
  placeholder?: string
  creatable?: boolean
}) => {
  const {
    data: indicators,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingIndicators,
    isFetchingNextPage,
  } = useIndicators()

  const { data: selectedIndicator } = useIndicator(value ?? undefined)
  const createIndicator = useCreateIndicator()

  return (
    <FieldGroup title="Select Indicator" disabled={isDisabled}>
      {creatable ? (
        <SelectWithSearchWithCreate
          placeholder={placeholder}
          options={indicators?.data}
          value={selectedIndicator ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            onChange(nextValue)
          }}
          isDisabled={isDisabled}
          isLoading={isLoadingIndicators || isFetchingNextPage}
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isClearable={isClearable}
          onCreateOption={(input) => {
            createIndicator.mutate(
              {
                name: input,
                unit: '',
              },
              {
                onSuccess: (indicator) => {
                  onChange(indicator)
                },
              },
            )
          }}
        />
      ) : (
        <SelectWithSearch
          placeholder={placeholder}
          options={indicators?.data}
          value={selectedIndicator ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            onChange(nextValue)
          }}
          isDisabled={isDisabled}
          isLoading={isLoadingIndicators || isFetchingNextPage}
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isClearable={isClearable}
        />
      )}
    </FieldGroup>
  )
}
