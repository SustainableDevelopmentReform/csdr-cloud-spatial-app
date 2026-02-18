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
  } = useDatasets(queryOptions)

  const { data: selectedDataset, isLoading: isLoadingSelectedDataset } =
    useDataset(
      props.isMulti === true ? undefined : (props.value ?? undefined),
      props.isMulti !== true && !!props.value,
    )

  const selectedDatasets = useMemo(() => {
    if (props.isMulti !== true) {
      return []
    }

    const selectedIds = props.value ?? []
    if (!selectedIds.length || !datasets?.data) {
      return []
    }

    const optionsById = new Map(
      datasets.data.map((dataset) => [dataset.id, dataset]),
    )
    return selectedIds
      .map((id) => optionsById.get(id))
      .filter((dataset): dataset is DatasetListItem => !!dataset)
  }, [datasets?.data, props])

  return (
    <FieldGroup
      title={title ?? `Select Dataset${props.isMulti === true ? 's' : ''}`}
      description={description}
      disabled={disabled}
    >
      {props.isMulti === true ? (
        <SelectWithSearch
          placeholder={placeholder}
          options={datasets?.data}
          value={selectedDatasets}
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
          isMulti
        />
      ) : (
        <SelectWithSearch
          placeholder={placeholder}
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
