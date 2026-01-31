import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { ProductListItem, useProducts } from '../_hooks'

export const ProductSelect = ({
  value,
  onChange,
  disabled,
  isClearable,
}: {
  value: string | null | undefined
  onChange: (product: ProductListItem | null) => void
  disabled?: boolean
  isClearable?: boolean
}) => {
  const {
    data: products,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingProducts,
    isFetchingNextPage,
  } = useProducts()

  const selectedProduct =
    products?.data?.find((product) => product.id === value) ?? null

  return (
    <FieldGroup title="Select Product" disabled={disabled}>
      <SelectWithSearch
        options={products?.data}
        value={selectedProduct}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
        isLoading={isLoadingProducts || isFetchingNextPage}
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
