import { indicatorQuerySchema } from '@repo/schemas/crud'
import {
  MultiValue,
  SelectWithSearch,
  SingleValue,
} from '@repo/ui/components/ui/select-with-search'
import { SelectWithSearchWithCreate } from '@repo/ui/components/ui/select-with-search-with-create'
import { useMemo } from 'react'
import z from 'zod'
import { FieldGroup } from '../../../../components/form/action'
import {
  IndicatorListItem,
  useCreateMeasuredIndicator,
  useIndicators,
} from '../_hooks'

type IndicatorsSelectBaseProps = {
  title?: string
  description?: string
  isDisabled?: boolean
  isClearable?: boolean
  placeholder?: string
  queryOptions?: z.infer<typeof indicatorQuerySchema>
}

type IndicatorsSelectProps = IndicatorsSelectBaseProps &
  (
    | {
        value: string[]
        onChange: (value: MultiValue<IndicatorListItem>) => void
        isMulti: true
        creatable?: false
      }
    | {
        value: string | null | undefined
        onChange: (value: SingleValue<IndicatorListItem>) => void
        isMulti?: false
        creatable?: boolean
      }
  )

export const IndicatorsSelect = (props: IndicatorsSelectProps) => {
  const {
    title,
    description,
    isDisabled,
    isClearable,
    placeholder,
    creatable,
    queryOptions,
  } = props

  const {
    data: indicators,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingIndicators,
    isFetchingNextPage,
  } = useIndicators(
    props.isMulti === true
      ? {
          ...queryOptions,
          excludeIndicatorIds: props.value,
        }
      : queryOptions,
  )

  const { data: selectedIndicators, isLoading: isLoadingSelectedIndicators } =
    useIndicators(
      { indicatorIds: props.value ?? [] },
      false,
      (props.value?.length ?? 0) > 0,
    )

  const createIndicator = useCreateMeasuredIndicator()

  const discriminatedProps = useMemo(() => {
    if (props.isMulti === true) {
      return {
        isMulti: true,
        value: selectedIndicators?.data ?? [],
        onChange: (nextValue: MultiValue<IndicatorListItem>) =>
          props.onChange(nextValue),
      } as const
    }
    return {
      isMulti: false,
      value: selectedIndicators?.data?.[0] ?? null,
      onChange: (nextValue: SingleValue<IndicatorListItem>) =>
        props.onChange(nextValue),
    } as const
  }, [props, selectedIndicators?.data])

  const commonProps = {
    placeholder: isLoadingSelectedIndicators ? 'Loading...' : placeholder,
    options: indicators?.data,
    isDisabled,
    isLoading:
      isLoadingIndicators || isFetchingNextPage || isLoadingSelectedIndicators,
    onSearch: (search: string | undefined) => setSearchParams({ search }),
    onMenuScrollToBottom: () => {
      if (hasNextPage) {
        fetchNextPage()
      }
    },
  }

  if (discriminatedProps.isMulti) {
    return (
      <FieldGroup
        title={title ?? 'Select Indicator(s)'}
        description={description}
        disabled={isDisabled}
      >
        <SelectWithSearch
          {...commonProps}
          value={discriminatedProps.value}
          onChange={discriminatedProps.onChange}
          isClearable={isClearable}
          isMulti
        />
      </FieldGroup>
    )
  }

  const singleOnChange = discriminatedProps.onChange

  return (
    <FieldGroup
      title={title ?? 'Select Indicator'}
      description={description}
      disabled={isDisabled}
    >
      {creatable ? (
        <SelectWithSearchWithCreate
          {...commonProps}
          value={discriminatedProps.value}
          onChange={singleOnChange}
          isClearable={isClearable}
          onCreateOption={(input) => {
            createIndicator.mutate(
              {
                name: input,
                unit: '',
              },
              {
                onSuccess: (indicator) => {
                  singleOnChange(indicator)
                },
              },
            )
          }}
        />
      ) : (
        <SelectWithSearch
          {...commonProps}
          value={discriminatedProps.value}
          onChange={singleOnChange}
          isClearable={isClearable}
        />
      )}
    </FieldGroup>
  )
}
