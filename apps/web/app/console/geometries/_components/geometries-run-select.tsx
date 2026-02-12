import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { MainRunBadge } from '../../_components/main-run-badge'
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
  isClearable,
}: {
  value: string | null | undefined
  geometriesId: string | null | undefined
  onChange: (geometriesRun: GeometriesRunListItem | null) => void
  disabled?: boolean
  isClearable?: boolean
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
        formatOptionLabel={(option) => (
          <span className="flex items-center gap-1">
            {option.geometries.mainRunId === option.id && (
              <MainRunBadge size="xs" variant="geometries" />
            )}
            {option.name ?? option.id}
          </span>
        )}
        isDisabled={disabled}
        onMenuScrollToBottom={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
        isLoading={isLoadingGeometriesRuns || isFetchingNextPage}
        isClearable={isClearable}
      />
    </FieldGroup>
  )
}
