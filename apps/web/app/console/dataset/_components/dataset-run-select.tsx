import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { DatasetRunListItem, useDatasetRun, useDatasetRuns } from '../_hooks'

export const DatasetRunSelect = ({
  value,
  datasetId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  datasetId: string | null | undefined
  onChange: (datasetRun: DatasetRunListItem | null) => void
  disabled?: boolean
}) => {
  const { data: datasetRuns, setSearchParams } = useDatasetRuns(
    datasetId ?? undefined,
  )

  const { data: selectedDatasetRun } = useDatasetRun(value ?? undefined)

  return (
    <FieldGroup title="Select Dataset Run" disabled={disabled}>
      <SelectWithSearch
        options={datasetRuns?.data}
        value={selectedDatasetRun ?? null}
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
