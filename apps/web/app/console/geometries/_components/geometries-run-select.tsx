import { FieldGroup } from '../../../../components/form/action'
import { GeometriesRunListItem, useGeometriesRuns } from '../_hooks'
import { SelectWithSearch } from '../../../../components/form/select-with-search'

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
  const { data: geometriesRuns } = useGeometriesRuns(
    geometriesId ?? undefined,
    { disablePagination: true },
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
        disabled={disabled}
      />
    </FieldGroup>
  )
}
