import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { MainRunBadge } from '../../_components/main-run-badge'
import { DatasetRunListItem, useDatasetRun, useDatasetRuns } from '../_hooks'

export const DatasetRunSelect = ({
  value,
  datasetId,
  onChange,
  title,
  disabled,
  isClearable,
}: {
  value: string | null | undefined
  datasetId: string | null | undefined
  onChange: (datasetRun: DatasetRunListItem | null) => void
  title?: string
  disabled?: boolean
  isClearable?: boolean
}) => {
  const {
    data: datasetRuns,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingDatasetRuns,
    isFetchingNextPage,
  } = useDatasetRuns(datasetId ?? undefined)

  const { data: selectedDatasetRun } = useDatasetRun(value ?? undefined)

  return (
    <FieldGroup title={title ?? 'Select Dataset Run'} disabled={disabled}>
      <SelectWithSearch
        options={datasetRuns?.data}
        value={selectedDatasetRun ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        formatOptionLabel={(option) => (
          <span className="flex items-center gap-1">
            {option.dataset.mainRunId === option.id && (
              <MainRunBadge size="xs" variant="dataset" />
            )}
            {option.name ?? option.id}
          </span>
        )}
        isDisabled={disabled}
        isLoading={isLoadingDatasetRuns || isFetchingNextPage}
        onMenuScrollToBottom={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
        isClearable={isClearable}
      />
    </FieldGroup>
  )
}
