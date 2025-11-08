import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { ProductListItem, useProduct, useProducts } from '../_hooks'

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

  const { data: selectedProduct } = useProduct(value ?? undefined)

  return (
    <FieldGroup title="Select Product" disabled={disabled}>
      <SelectWithSearch
        options={products?.data}
        value={selectedProduct ?? null}
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
