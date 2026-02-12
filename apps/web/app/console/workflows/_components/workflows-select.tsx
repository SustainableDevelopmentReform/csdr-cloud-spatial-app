import { FieldGroup } from '../../../../components/form/action'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { WorkflowsListItem, useAllWorkflows, useWorkflows } from '../_hooks'

export const WorkflowsSelect = ({
  value,
  onChange,
  disabled,
  isClearable = true,
}: {
  value: string | null | undefined
  onChange: (workflows: WorkflowsListItem | null) => void
  disabled?: boolean
  isClearable?: boolean
}) => {
  const {
    data: allWorkflows,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingWorkflows,
    isFetchingNextPage,
  } = useAllWorkflows()

  const { data: selectedWorkflows } = useWorkflows(value ?? undefined)

  return (
    <FieldGroup title="Select Workflows" disabled={disabled}>
      <SelectWithSearch
        options={allWorkflows?.data}
        value={selectedWorkflows ?? null}
        onSearch={(search) => {
          setSearchParams({ search })
        }}
        onChange={(nextValue) => {
          onChange(nextValue)
        }}
        isDisabled={disabled}
        isLoading={isLoadingWorkflows || isFetchingNextPage}
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
