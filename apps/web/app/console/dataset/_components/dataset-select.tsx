import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { DatasetListItem, useDataset, useDatasets } from '../_hooks'

export const DatasetSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (dataset: DatasetListItem | null) => void
  disabled?: boolean
}) => {
  const {
    data: datasets,
    setSearchParams,
    isLoading: isLoadingDatasets,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDatasets()

  const { data: selectedDataset, isLoading: isLoadingSelectedDataset } =
    useDataset(value ?? undefined)

  return (
    <FieldGroup title="Select Dataset" disabled={disabled}>
      <SelectWithSearch
        options={datasets?.data}
        value={selectedDataset ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
        isLoading={
          isLoadingDatasets || isLoadingSelectedDataset || isFetchingNextPage
        }
        onMenuScrollToBottom={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
      />
    </FieldGroup>
  )
}
