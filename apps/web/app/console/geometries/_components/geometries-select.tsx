import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { GeometriesListItem, useAllGeometries, useGeometries } from '../_hooks'

export const GeometriesSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (geometries: GeometriesListItem | null) => void
  disabled?: boolean
}) => {
  const { data: allGeometries, setSearchParams } = useAllGeometries()

  const { data: selectedGeometries } = useGeometries(value ?? undefined)

  return (
    <FieldGroup title="Select Geometries" disabled={disabled}>
      <SelectWithSearch
        options={allGeometries?.data}
        value={selectedGeometries ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
      />
    </FieldGroup>
  )
}
