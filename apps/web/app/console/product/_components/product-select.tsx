import { productQuerySchema } from '@repo/schemas/crud'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/form/action'
import { ProductListItem, useProducts } from '../_hooks'

export const ProductSelect = ({
  value,
  onChange,
  disabled,
  isClearable,
  queryOptions,
}: {
  value: string | null | undefined
  onChange: (product: ProductListItem | null) => void
  disabled?: boolean
  isClearable?: boolean
  queryOptions?: z.infer<typeof productQuerySchema>
}) => {
  const {
    data: products,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingProducts,
    isFetchingNextPage,
  } = useProducts(queryOptions)

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
