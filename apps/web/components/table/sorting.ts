import type { OnChangeFn, SortingState } from '@tanstack/react-table'

export type SortDirection = 'asc' | 'desc'

export const createSortResolver =
  <Sort extends string>(sortOptions: readonly Sort[]) =>
  (sort: string | undefined): Sort | undefined =>
    sortOptions.find((sortOption) => sortOption === sort)

export const getManualSortingState = <Sort extends string>(
  sort: Sort | undefined,
  order: SortDirection | undefined,
): SortingState => (sort ? [{ id: sort, desc: order === 'desc' }] : [])

export const createManualSortingChangeHandler = <Sort extends string>({
  onSortChange,
  resolveSort,
  sortingState,
}: {
  onSortChange?: (
    sort: Sort | undefined,
    order: SortDirection | undefined,
  ) => void
  resolveSort: (sort: string | undefined) => Sort | undefined
  sortingState: SortingState
}): OnChangeFn<SortingState> => {
  return (sorting) => {
    const nextSortingState =
      typeof sorting === 'function' ? sorting(sortingState) : sorting
    const firstSorting = nextSortingState[0]
    const sort = resolveSort(firstSorting?.id)

    onSortChange?.(
      sort,
      sort && firstSorting ? (firstSorting.desc ? 'desc' : 'asc') : undefined,
    )
  }
}
