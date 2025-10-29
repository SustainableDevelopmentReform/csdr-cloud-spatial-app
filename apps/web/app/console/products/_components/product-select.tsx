import { FieldGroup } from '../../../../components/action'
import { ProductListItem, useProducts } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'
export const ProductSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (id: string | null, product: ProductListItem | null) => void
  disabled?: boolean
}) => {
  const { data: products } = useProducts({ disablePagination: true })
  return (
    <FieldGroup title="Select Product" disabled={disabled}>
      <SelectWithSearch
        options={products?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            products?.data?.find((product) => product.id === value) ?? null,
          )
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
