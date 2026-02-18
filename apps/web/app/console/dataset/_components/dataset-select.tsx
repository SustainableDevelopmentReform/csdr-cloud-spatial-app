import { FieldGroup } from '../../../../components/form/action'
import {
  MultiValue,
  SelectWithSearch,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { datasetQuerySchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import z from 'zod'
import { DatasetListItem, useDataset, useDatasets } from '../_hooks'

type DatasetSelectBaseProps = {
  title?: string
  description?: string
  disabled?: boolean
  isClearable?: boolean
  placeholder?: string
  queryOptions?: z.infer<typeof datasetQuerySchema>
}

type DatasetSelectProps = DatasetSelectBaseProps &
  (
    | {
        value: string[]
        onChange: (value: MultiValue<DatasetListItem>) => void
        isMulti: true
      }
    | {
        value: string | null | undefined
        onChange: (value: SingleValue<DatasetListItem>) => void
        isMulti?: false
      }
  )

export const DatasetSelect = (props: DatasetSelectProps) => {
  const {
    title,
    description,
    disabled,
    isClearable = true,
    placeholder,
    queryOptions,
  } = props
  const {
    data: datasets,
    setSearchParams,
    isLoading: isLoadingDatasets,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDatasets(
    props.isMulti === true
      ? {
          ...queryOptions,
          excludeDatasetIds: props.value,
        }
      : queryOptions,
  )

  const selectedDatasetIds = props.isMulti === true ? (props.value ?? []) : []
  const hasSelectedDatasets = selectedDatasetIds.length > 0
  const {
    data: selectedDatasetsQuery,
    isLoading: isLoadingSelectedDatasets,
  } = useDatasets(
    {
      datasetIds: selectedDatasetIds,
      size: selectedDatasetIds.length || undefined,
    },
    false,
    hasSelectedDatasets,
  )

  const { data: selectedDataset, isLoading: isLoadingSelectedDataset } =
    useDataset(
      props.isMulti === true ? undefined : (props.value ?? undefined),
      props.isMulti !== true && !!props.value,
    )

  const selectedDatasetOptions = useMemo(() => {
    if (props.isMulti !== true) {
      return []
    }

    if (!selectedDatasetIds.length || !selectedDatasetsQuery?.data) {
      return []
    }

    const optionsById = new Map(
      selectedDatasetsQuery.data.map((dataset) => [dataset.id, dataset]),
    )
    return selectedDatasetIds
      .map((id) => optionsById.get(id))
      .filter((dataset): dataset is DatasetListItem => !!dataset)
  }, [props.isMulti, selectedDatasetIds, selectedDatasetsQuery?.data])

  return (
    <FieldGroup
      title={title ?? `Select Dataset${props.isMulti === true ? 's' : ''}`}
      description={description}
      disabled={disabled}
    >
      {props.isMulti === true ? (
        <SelectWithSearch
          placeholder={isLoadingSelectedDatasets ? 'Loading...' : placeholder}
          options={datasets?.data}
          value={selectedDatasetOptions}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
          }}
          isDisabled={disabled}
          isLoading={
            isLoadingDatasets ||
            isLoadingSelectedDatasets ||
            isFetchingNextPage
          }
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isClearable={isClearable}
          isMulti
        />
      ) : (
        <SelectWithSearch
          placeholder={isLoadingSelectedDataset ? 'Loading...' : placeholder}
          options={datasets?.data}
          value={selectedDataset ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
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
          isClearable={isClearable}
        />
      )}
    </FieldGroup>
  )
}
