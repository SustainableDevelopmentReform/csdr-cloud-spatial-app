import { productQuerySchema } from '@repo/schemas/crud'
import {
  MultiValue,
  SelectWithSearch,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { useMemo } from 'react'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/form/action'
import { ProductListItem, useProducts } from '../_hooks'

type ProductSelectBaseProps = {
  title?: string
  description?: string
  disabled?: boolean
  isClearable?: boolean
  queryOptions?: z.infer<typeof productQuerySchema>
}

type ProductSelectProps = ProductSelectBaseProps &
  (
    | {
        value: string[]
        onChange: (value: MultiValue<ProductListItem>) => void
        isMulti: true
      }
    | {
        value: string | null | undefined
        onChange: (value: SingleValue<ProductListItem>) => void
        isMulti?: false
      }
  )

export const ProductSelect = (props: ProductSelectProps) => {
  const { title, description, disabled, isClearable, queryOptions } = props
  const {
    data: products,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingProducts,
    isFetchingNextPage,
  } = useProducts(
    props.isMulti === true
      ? {
          ...queryOptions,
          excludeProductIds: props.value,
        }
      : queryOptions,
  )

  const selectedProductIds = props.isMulti === true ? props.value : []
  const hasSelectedProducts = selectedProductIds.length > 0
  const { data: selectedProductsQuery, isLoading: isLoadingSelectedProducts } =
    useProducts(
      {
        productIds: selectedProductIds,
        size: selectedProductIds.length || undefined,
      },
      false,
      hasSelectedProducts,
    )
  const selectedProducts = useMemo(() => {
    if (props.isMulti !== true) {
      return []
    }

    if (!selectedProductIds.length || !selectedProductsQuery?.data) {
      return []
    }

    const optionsById = new Map(
      selectedProductsQuery.data.map((product) => [product.id, product]),
    )

    return selectedProductIds
      .map((id) => optionsById.get(id))
      .filter((product): product is ProductListItem => !!product)
  }, [props.isMulti, selectedProductIds, selectedProductsQuery?.data])

  return (
    <FieldGroup
      title={title ?? `Select Product${props.isMulti === true ? 's' : ''}`}
      description={description}
      disabled={disabled}
    >
      {props.isMulti === true ? (
        <SelectWithSearch
          options={products?.data}
          value={selectedProducts}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
          }}
          isDisabled={disabled}
          isLoading={
            isLoadingProducts || isLoadingSelectedProducts || isFetchingNextPage
          }
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isClearable={isClearable}
          isMulti
        />
      ) : (
        <SelectWithSearch
          options={products?.data}
          value={products?.data?.find((product) => product.id === props.value)}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
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
      )}
    </FieldGroup>
  )
}
