'use client'

import { useMemo } from 'react'
import Pagination from '~/components/table/pagination'
import { TableFilterPopover } from '~/components/table/filter-popover'
import BaseCrudTable from '../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../components/table/table-row-delete-action'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { canEditConsoleResource } from '../../../utils/access-control'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { DatasetBreadcrumbs } from './_components/breadcrumbs'
import { DatasetCreateAction } from './_components/dataset-create-action'
import {
  DatasetListItem,
  useDatasetLink,
  useDatasets,
  useDeleteDataset,
} from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const DatasetDeleteAction = ({ dataset }: { dataset: DatasetListItem }) => {
  const deleteDataset = useDeleteDataset(dataset.id)

  return (
    <TableRowDeleteAction
      entityName="dataset"
      itemName={dataset.name}
      mutation={deleteDataset}
    />
  )
}

const DatasetFeature = () => {
  const { access } = useAccessControl()
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useDatasets(undefined, true)
  const datasetLink = useDatasetLink()
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])
  const activeFilters = useMemo(() => {
    if (!geographicBounds) {
      return []
    }

    return [
      {
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      },
    ]
  }, [geographicBounds, setSearchParams])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<DatasetBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Datasets"
        description="Create and manage datasets in the system."
        actions={<DatasetCreateAction />}
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
              placeholder="Search datasets"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
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
          title="Dataset"
          itemLink={datasetLink}
          itemActionLabel="Edit"
          showEditAction={false}
          canModifyItem={(dataset) =>
            canEditConsoleResource({
              access,
              resource: 'dataset',
              resourceData: dataset,
            })
          }
          deleteAction={(dataset) => <DatasetDeleteAction dataset={dataset} />}
          query={query}
          onSortChange={(query) =>
            setSearchParams({ sort: query.sort, order: query.order })
          }
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default DatasetFeature
