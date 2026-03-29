import { FieldGroup } from '../../../../components/form/action'
import {
  MultiValue,
  SelectWithSearch,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { geometriesQuerySchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import z from 'zod'
import { GeometriesListItem, useAllGeometries, useGeometries } from '../_hooks'

type GeometriesSelectBaseProps = {
  title?: string
  description?: string
  disabled?: boolean
  isClearable?: boolean
  placeholder?: string
  queryOptions?: z.infer<typeof geometriesQuerySchema>
}

type GeometriesSelectProps = GeometriesSelectBaseProps &
  (
    | {
        value: string[]
        onChange: (value: MultiValue<GeometriesListItem>) => void
        isMulti: true
      }
    | {
        value: string | null | undefined
        onChange: (value: SingleValue<GeometriesListItem>) => void
        isMulti?: false
      }
  )

export const GeometriesSelect = (props: GeometriesSelectProps) => {
  const {
    title,
    description,
    disabled,
    isClearable = true,
    placeholder,
    queryOptions,
  } = props
  const {
    data: allGeometries,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingGeometries,
    isFetchingNextPage,
  } = useAllGeometries(
    props.isMulti === true
      ? {
          ...queryOptions,
          excludeGeometriesIds: props.value,
        }
      : queryOptions,
  )

  const selectedGeometriesIds = useMemo(
    () => (props.isMulti === true ? (props.value ?? []) : []),
    [props.isMulti, props.value],
  )
  const hasSelectedGeometries = selectedGeometriesIds.length > 0
  const {
    data: selectedGeometriesQuery,
    isLoading: isLoadingSelectedGeometries,
  } = useAllGeometries(
    {
      geometriesIds: selectedGeometriesIds,
      size: selectedGeometriesIds.length || undefined,
    },
    false,
    hasSelectedGeometries,
  )

  const {
    data: selectedGeometries,
    isLoading: isLoadingSelectedGeometriesSingle,
  } = useGeometries(
    props.isMulti === true ? undefined : (props.value ?? undefined),
    props.isMulti !== true && !!props.value,
  )

  const selectedGeometriesList = useMemo(() => {
    if (props.isMulti !== true) {
      return []
    }

    if (!selectedGeometriesIds.length || !selectedGeometriesQuery?.data) {
      return []
    }

    const optionsById = new Map(
      selectedGeometriesQuery.data.map((geometries) => [
        geometries.id,
        geometries,
      ]),
    )
    return selectedGeometriesIds
      .map((id) => optionsById.get(id))
      .filter((geometries): geometries is GeometriesListItem => !!geometries)
  }, [props.isMulti, selectedGeometriesIds, selectedGeometriesQuery?.data])

  return (
    <FieldGroup
      title={title ?? `Select Geometr${props.isMulti === true ? 'ies' : 'y'}`}
      description={description}
      disabled={disabled}
    >
      {props.isMulti === true ? (
        <SelectWithSearch
          placeholder={isLoadingSelectedGeometries ? 'Loading...' : placeholder}
          options={allGeometries?.data}
          value={selectedGeometriesList}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
          }}
          isDisabled={disabled}
          isLoading={
            isLoadingGeometries ||
            isLoadingSelectedGeometries ||
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
          placeholder={
            isLoadingSelectedGeometriesSingle ? 'Loading...' : placeholder
          }
          options={allGeometries?.data}
          value={selectedGeometries ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            props.onChange(nextValue)
          }}
          isDisabled={disabled}
          isLoading={isLoadingGeometries || isFetchingNextPage}
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
