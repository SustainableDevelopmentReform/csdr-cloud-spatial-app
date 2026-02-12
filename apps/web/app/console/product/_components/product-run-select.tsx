import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { MainRunBadge } from '../../_components/main-run-badge'
import { ProductRunListItem, useProductRuns } from '../_hooks'

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

  const selectedProductRun =
    productRuns?.data?.find((run) => run.id === value) ?? null

  return (
    <FieldGroup title="Select Product Run" disabled={disabled}>
      <SelectWithSearch
        options={productRuns?.data}
        value={selectedProductRun}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        formatOptionLabel={(option) => (
          <span className="flex items-center gap-1">
            {option.product.mainRunId === option.id && (
              <MainRunBadge size="xs" variant="product" />
            )}
            {option.name ?? option.id}
          </span>
        )}
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
