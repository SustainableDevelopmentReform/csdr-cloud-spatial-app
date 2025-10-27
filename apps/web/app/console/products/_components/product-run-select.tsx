import { FieldGroup } from '../../../../components/action'
import { ProductRunListItem, useProductRuns } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'
export const ProductRunSelect = ({
  value,
  productId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  productId: string | null | undefined
  onChange: (id: string | null, productRun: ProductRunListItem | null) => void
  disabled?: boolean
}) => {
  const { data: productRuns, setSearchParams } = useProductRuns(
    productId ?? undefined,
  )
  return (
    <FieldGroup title="Select Product Run" disabled={disabled}>
      <SelectWithSearch
        options={productRuns?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            productRuns?.data?.find((productRun) => productRun.id === value) ??
              null,
          )
        }}
        onSearch={(value) => {
          setSearchParams({ search: value })
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
