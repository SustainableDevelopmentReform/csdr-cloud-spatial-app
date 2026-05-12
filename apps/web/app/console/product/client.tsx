'use client'

import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import BaseCrudTable from '../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../components/table/table-row-delete-action'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { SearchInput } from '../../../components/table/search-input'
import { canEditConsoleResource } from '../../../utils/access-control'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { DatasetSelect } from '../dataset/_components/dataset-select'
import { GeometriesSelect } from '../geometries/_components/geometries-select'
import { IndicatorsSelect } from '../indicator/_components/indicators-select'
import { ProductsBreadcrumbs } from './_components/breadcrumbs'
import { ProductCreateAction } from './_components/product-create-action'
import {
  ProductListItem,
  useDeleteProduct,
  useProductLink,
  useProducts,
} from './_hooks'

const ProductDeleteAction = ({ product }: { product: ProductListItem }) => {
  const deleteProduct = useDeleteProduct(product.id)

  return (
    <TableRowDeleteAction
      entityName="product"
      itemName={product.name}
      mutation={deleteProduct}
    />
  )
}

const ProductFeature = () => {
  const { access } = useAccessControl()
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useProducts(undefined, true)
  const productLink = useProductLink()
  const selectedDatasetIds = useMemo(
    () => normalizeFilterValues(query?.datasetId),
    [query?.datasetId],
  )
  const selectedGeometriesIds = useMemo(
    () => normalizeFilterValues(query?.geometriesId),
    [query?.geometriesId],
  )
  const selectedIndicatorIds = useMemo(
    () => normalizeFilterValues(query?.indicatorId),
    [query?.indicatorId],
  )
  const geographicBounds = getGeographicBoundsFromQuery(query)
  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (selectedDatasetIds.length > 0) {
      filters.push({
        id: 'datasets',
        label: 'Datasets',
        value: `${selectedDatasetIds.length} selected`,
        onClear: () => setSearchParams({ datasetId: undefined }),
      })
    }

    if (selectedGeometriesIds.length > 0) {
      filters.push({
        id: 'geometries',
        label: 'Boundaries',
        value: `${selectedGeometriesIds.length} selected`,
        onClear: () => setSearchParams({ geometriesId: undefined }),
      })
    }

    if (selectedIndicatorIds.length > 0) {
      filters.push({
        id: 'indicators',
        label: 'Indicators',
        value: `${selectedIndicatorIds.length} selected`,
        onClear: () => setSearchParams({ indicatorId: undefined }),
      })
    }

    if (geographicBounds) {
      filters.push({
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      })
    }

    return filters
  }, [
    geographicBounds,
    selectedDatasetIds.length,
    selectedGeometriesIds.length,
    selectedIndicatorIds.length,
    setSearchParams,
  ])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<ProductsBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Products"
        description="Create and manage products in the system."
        actions={<ProductCreateAction />}
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.data.length}
            totalCount={data?.totalCount}
            onLoadMore={() => fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search products"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <div>
                <DatasetSelect
                  title="Filter Datasets"
                  value={selectedDatasetIds}
                  onChange={(selected) =>
                    setSearchParams({
                      datasetId: selected.map((dataset) => dataset.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <div>
                <GeometriesSelect
                  title="Filter Geometries"
                  value={selectedGeometriesIds}
                  onChange={(selected) =>
                    setSearchParams({
                      geometriesId: selected.map((geometries) => geometries.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <div>
                <IndicatorsSelect
                  title="Filter Indicators"
                  value={selectedIndicatorIds}
                  onChange={(selected) =>
                    setSearchParams({
                      indicatorId: selected.map((indicator) => indicator.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <GeographicBoundsPickerDialog
                title="Area of Interest"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams(toGeographicBoundsQuery(bounds))
                }
                onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
              />
            </TableFilterPopover>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="Product"
          itemLink={productLink}
          itemActionLabel="About"
          showEditAction={false}
          canModifyItem={(product) =>
            canEditConsoleResource({
              access,
              resource: 'product',
              resourceData: product,
            })
          }
          deleteAction={(product) => <ProductDeleteAction product={product} />}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default ProductFeature
