import { FieldGroup } from '../../../../components/action'
import { SelectWithSearch } from '../../../../components/select-with-search'
import { GeometriesListItem, useAllGeometries } from '../_hooks'

export const GeometriesSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (id: string | null, geometries: GeometriesListItem | null) => void
  disabled?: boolean
}) => {
  const { data: geometries } = useAllGeometries({ disablePagination: true })
  return (
    <FieldGroup title="Select Geometries" disabled={disabled}>
      <SelectWithSearch
        options={geometries?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            geometries?.data?.find((geometries) => geometries.id === value) ??
              null,
          )
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
