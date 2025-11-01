import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { ProductRunListItem, useProductRun, useProductRuns } from '../_hooks'

export const ProductRunSelect = ({
  value,
  productId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  productId: string | null | undefined
  onChange: (productRun: ProductRunListItem | null) => void
  disabled?: boolean
}) => {
  const { data: productRuns, setSearchParams } = useProductRuns(
    productId ?? undefined,
  )

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
      />
    </FieldGroup>
  )
}
