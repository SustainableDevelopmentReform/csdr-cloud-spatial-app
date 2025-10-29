import { FieldGroup } from '../../../../components/action'
import { DatasetListItem, useDatasets } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'

export const DatasetSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (id: string | null, dataset: DatasetListItem | null) => void
  disabled?: boolean
}) => {
  const { data: datasets } = useDatasets({ disablePagination: true })
  return (
    <FieldGroup title="Select Dataset" disabled={disabled}>
      <SelectWithSearch
        options={datasets?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            datasets?.data?.find((dataset) => dataset.id === value) ?? null,
          )
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
