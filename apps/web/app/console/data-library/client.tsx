'use client'

import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
import { formatDateTime } from '@repo/ui/lib/date'
import {
  ColumnDef,
  getCoreRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  EarthIcon,
  SquareArrowOutUpRightIcon,
  SquareStackIcon,
  Table2Icon,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import Link from '~/components/link'
import BaseTable from '~/components/table/table'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import { SearchInput } from '~/components/table/search-input'
import { SortButton } from '~/components/table/crud-table'
import {
  DATA_LIBRARY_BASE_PATH,
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  PRODUCTS_BASE_PATH,
} from '~/lib/paths'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '../_components/console-simple-breadcrumbs'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import {
  DataLibraryListItem,
  DataLibraryQuery,
  DataLibraryResourceType,
  useDataLibrary,
} from './_hooks'

type DataLibrarySort = NonNullable<DataLibraryQuery['sort']>

const dataLibrarySortOptions: DataLibrarySort[] = [
  'name',
  'createdAt',
  'updatedAt',
]

const resourceTypeConfig: Record<
  DataLibraryResourceType,
  { icon: LucideIcon; label: string }
> = {
  dataset: {
    icon: EarthIcon,
    label: 'Dataset',
  },
  boundary: {
    icon: SquareStackIcon,
    label: 'Boundary',
  },
  product: {
    icon: Table2Icon,
    label: 'Product',
  },
}

const resourceTypes: DataLibraryResourceType[] = [
  'dataset',
  'boundary',
  'product',
]

const normalizeResourceTypes = (
  resourceType: DataLibraryQuery['resourceType'],
): DataLibraryResourceType[] => {
  if (!resourceType) {
    return []
  }

  return Array.isArray(resourceType) ? resourceType : [resourceType]
}

const resolveSort = (sort: string | undefined): DataLibrarySort | undefined =>
  dataLibrarySortOptions.find((sortOption) => sortOption === sort)

const getResourceLink = (resource: DataLibraryListItem): string => {
  switch (resource.resourceType) {
    case 'dataset':
      return `${DATASETS_BASE_PATH}/${resource.id}`
    case 'boundary':
      return `${GEOMETRIES_BASE_PATH}/${resource.id}`
    case 'product':
      return `${PRODUCTS_BASE_PATH}/${resource.id}`
  }
}

const DataLibraryTypeBadge = ({
  resourceType,
}: {
  resourceType: DataLibraryResourceType
}) => {
  const config = resourceTypeConfig[resourceType]
  const Icon = config.icon

  return (
    <Badge variant="secondary" className="font-semibold">
      <Icon />
      {config.label}
    </Badge>
  )
}

const DataLibraryFeature = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    query,
    setSearchParams,
  } = useDataLibrary(undefined, true)
  const selectedResourceTypes = useMemo(
    () => normalizeResourceTypes(query?.resourceType),
    [query?.resourceType],
  )
  const geographicBounds = getGeographicBoundsFromQuery(query)
  const sortingState: SortingState = query?.sort
    ? [{ id: query.sort, desc: query.order === 'desc' }]
    : []

  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (selectedResourceTypes.length > 0) {
      filters.push({
        id: 'resource-type',
        label: 'Type',
        value: selectedResourceTypes
          .map((resourceType) => resourceTypeConfig[resourceType].label)
          .join(', '),
        onClear: () =>
          setSearchParams({ resourceType: undefined, page: undefined }),
      })
    }

    if (geographicBounds) {
      filters.push({
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () =>
          setSearchParams({
            ...toGeographicBoundsQuery(null),
            page: undefined,
          }),
      })
    }

    return filters
  }, [geographicBounds, selectedResourceTypes, setSearchParams])

  const columns = useMemo<ColumnDef<DataLibraryListItem>[]>(() => {
    return [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <SortButton
            order={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
          </SortButton>
        ),
        cell: (info) => (
          <span className="font-medium text-foreground">
            {info.row.original.name}
          </span>
        ),
        minSize: 260,
      },
      {
        id: 'resourceType',
        accessorFn: (row) => row.resourceType,
        header: () => <span>Type</span>,
        cell: (info) => (
          <DataLibraryTypeBadge resourceType={info.row.original.resourceType} />
        ),
        size: 140,
      },
      {
        id: 'updatedAt',
        accessorFn: (row) => row.updatedAt,
        header: ({ column }) => (
          <SortButton
            order={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Updated
          </SortButton>
        ),
        cell: (info) => formatDateTime(info.row.original.updatedAt),
        size: 180,
      },
      {
        id: 'description',
        accessorFn: (row) => row.description,
        header: () => <span>Description</span>,
        cell: (info) => (
          <span className="text-foreground">
            {info.row.original.description}
          </span>
        ),
        size: 220,
      },
      {
        id: 'action',
        header: () => <span></span>,
        cell: (info) => (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
          >
            <Link href={getResourceLink(info.row.original)}>
              About
              <SquareArrowOutUpRightIcon className="size-4" />
            </Link>
          </Button>
        ),
        size: 140,
      },
    ]
  }, [])

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: sortingState,
    },
    enableMultiSort: false,
    onSortingChange: (sorting) => {
      const nextSortingState =
        typeof sorting === 'function' ? sorting(sortingState) : sorting
      const firstSorting = nextSortingState[0]
      const sort = resolveSort(firstSorting?.id)

      setSearchParams({
        sort,
        order:
          sort && firstSorting
            ? firstSorting.desc
              ? 'desc'
              : 'asc'
            : undefined,
        page: undefined,
      })
    },
  })

  const toggleResourceType = (resourceType: DataLibraryResourceType) => {
    const nextResourceTypes = selectedResourceTypes.includes(resourceType)
      ? selectedResourceTypes.filter((selected) => selected !== resourceType)
      : [...selectedResourceTypes, resourceType]

    setSearchParams({
      resourceType:
        nextResourceTypes.length > 0 ? nextResourceTypes : undefined,
      page: undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs
            items={[
              { label: 'Data Library', href: DATA_LIBRARY_BASE_PATH },
              { label: 'Search' },
            ]}
          />
        }
      />
      <ConsoleCrudListFrame
        title="Data Library"
        description="Explore data sets available within the platform"
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
              placeholder="Search"
              value={query?.search ?? ''}
              onChange={(event) =>
                setSearchParams({
                  search: event.target.value,
                  page: undefined,
                })
              }
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Type</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {resourceTypes.map((resourceType) => {
                    const config = resourceTypeConfig[resourceType]
                    const Icon = config.icon
                    const isSelected =
                      selectedResourceTypes.includes(resourceType)

                    return (
                      <Button
                        key={resourceType}
                        type="button"
                        variant={isSelected ? 'secondary' : 'outline'}
                        className={cn(
                          'justify-start',
                          isSelected && 'border-transparent',
                        )}
                        aria-pressed={isSelected}
                        onClick={() => toggleResourceType(resourceType)}
                      >
                        <Icon className="size-4" />
                        {config.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <GeographicBoundsPickerDialog
                title="Area of Interest"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams({
                    ...toGeographicBoundsQuery(bounds),
                    page: undefined,
                  })
                }
                onClear={() =>
                  setSearchParams({
                    ...toGeographicBoundsQuery(null),
                    page: undefined,
                  })
                }
              />
            </TableFilterPopover>
          </div>
        }
      >
        <BaseTable
          table={table}
          isLoading={isLoading}
          emptyStateLabel="No data library resources found"
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default DataLibraryFeature
