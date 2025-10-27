import { FieldGroup } from '../../../../components/action'
import { GeometriesRunListItem, useGeometriesRuns } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'

export const GeometriesRunSelect = ({
  value,
  geometriesId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  geometriesId: string | null | undefined
  onChange: (
    id: string | null,
    geometriesRun: GeometriesRunListItem | null,
  ) => void
  disabled?: boolean
}) => {
  const { data: geometriesRuns, setSearchParams } = useGeometriesRuns(
    geometriesId ?? undefined,
  )
  return (
    <FieldGroup title="Select Geometries Run" disabled={disabled}>
      <SelectWithSearch
        options={geometriesRuns?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            geometriesRuns?.data?.find(
              (geometriesRun) => geometriesRun.id === value,
            ) ?? null,
          )
        }}
        onSearch={(value) => {
          setSearchParams({ search: value })
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
