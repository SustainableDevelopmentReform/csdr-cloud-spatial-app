import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '../../../../components/form/select-with-search'
import { SelectWithSearchWithCreate } from '../../../../components/form/select-with-search-with-create'
import {
  VariableListItem,
  useCreateVariable,
  useVariable,
  useVariables,
} from '../_hooks'

export const VariablesSelect = ({
  value,
  onChange,
  isDisabled,
  isClearable,
  placeholder,
  creatable,
}: {
  value: string | null | undefined
  onChange: (variable: VariableListItem | null) => void
  isDisabled?: boolean
  isClearable?: boolean
  placeholder?: string
  creatable?: boolean
}) => {
  const {
    data: variables,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingVariables,
    isFetchingNextPage,
  } = useVariables()

  const { data: selectedVariable } = useVariable(value ?? undefined)
  const createVariable = useCreateVariable()

  return (
    <FieldGroup title="Select Variable" disabled={isDisabled}>
      {creatable ? (
        <SelectWithSearchWithCreate
          placeholder={placeholder}
          options={variables?.data}
          value={selectedVariable ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            onChange(nextValue)
          }}
          isDisabled={isDisabled}
          isLoading={isLoadingVariables || isFetchingNextPage}
          onMenuScrollToBottom={() => {
            if (hasNextPage) {
              fetchNextPage()
            }
          }}
          isClearable={isClearable}
          onCreateOption={(input) => {
            createVariable.mutate(
              {
                name: input,
                unit: '',
              },
              {
                onSuccess: (variable) => {
                  onChange(variable)
                },
              },
            )
          }}
        />
      ) : (
        <SelectWithSearch
          placeholder={placeholder}
          options={variables?.data}
          value={selectedVariable ?? null}
          onSearch={(search) => {
            setSearchParams({ search })
          }}
          onChange={(nextValue) => {
            onChange(nextValue)
          }}
          isDisabled={isDisabled}
          isLoading={isLoadingVariables || isFetchingNextPage}
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
