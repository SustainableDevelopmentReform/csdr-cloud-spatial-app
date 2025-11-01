import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { DatasetRunListItem, useDatasetRuns } from '../_hooks'

export const DatasetRunSelect = ({
  value,
  datasetId,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  datasetId: string | null | undefined
  onChange: (id: string | null, datasetRun: DatasetRunListItem | null) => void
  disabled?: boolean
}) => {
  const { data: datasetRuns } = useDatasetRuns(datasetId ?? undefined, {
    disablePagination: true,
  })
  return (
    <FieldGroup title="Select Dataset Run" disabled={disabled}>
      <SelectWithSearch
        options={datasetRuns?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            datasetRuns?.data?.find((datasetRun) => datasetRun.id === value) ??
              null,
          )
        }}
        disabled={disabled}
      />
    </FieldGroup>
  )
}
