import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { ProductRunListItem, useProductRun, useProductRuns } from '../_hooks'

export const ProductRunSelect = ({
  value,
  productId,
  onChange,
  disabled,
  isClearable,
}: {
  value: string | null | undefined
  productId: string | null | undefined
  onChange: (productRun: ProductRunListItem | null) => void
  disabled?: boolean
  isClearable?: boolean
}) => {
  const {
    data: productRuns,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingProductRuns,
    isFetchingNextPage,
  } = useProductRuns(productId ?? undefined)

  const { data: selectedProductRun } = useProductRun(value ?? undefined)

  return (
    <FieldGroup title="Select Product Run" disabled={disabled}>
      <SelectWithSearch
        options={productRuns?.data}
        value={selectedProductRun ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
        isLoading={isLoadingProductRuns || isFetchingNextPage}
        onMenuScrollToBottom={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
        isClearable={isClearable}
      />
    </FieldGroup>
  )
}
