import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { ProductRunListItem, useProductRuns } from '../_hooks'

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
  const { data: productRuns } = useProductRuns(productId ?? undefined)
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
        onSearch={() => {}}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
