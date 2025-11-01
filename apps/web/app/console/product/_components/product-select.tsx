import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { ProductListItem, useProduct, useProducts } from '../_hooks'

export const ProductSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (product: ProductListItem | null) => void
  disabled?: boolean
}) => {
  const { data: products, setSearchParams } = useProducts()

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
      />
    </FieldGroup>
  )
}
