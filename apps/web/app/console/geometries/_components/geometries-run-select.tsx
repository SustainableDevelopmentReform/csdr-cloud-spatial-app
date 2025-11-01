import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import {
  GeometriesRunListItem,
  useGeometriesRun,
  useGeometriesRuns,
} from '../_hooks'

export const GeometriesRunSelect = ({
  value,
  geometriesId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  geometriesId: string | null | undefined
  onChange: (geometriesRun: GeometriesRunListItem | null) => void
  disabled?: boolean
}) => {
  const {
    data: geometriesRuns,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingGeometriesRuns,
    isFetchingNextPage,
  } = useGeometriesRuns(geometriesId ?? undefined)

  const { data: selectedGeometriesRun } = useGeometriesRun(value ?? undefined)

  return (
    <FieldGroup title="Select Geometries Run" disabled={disabled}>
      <SelectWithSearch
        options={geometriesRuns?.data}
        value={selectedGeometriesRun ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
        onMenuScrollToBottom={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
        isLoading={isLoadingGeometriesRuns || isFetchingNextPage}
      />
    </FieldGroup>
  )
}
