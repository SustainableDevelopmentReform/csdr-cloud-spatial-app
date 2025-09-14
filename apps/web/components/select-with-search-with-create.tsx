import { Button } from '@repo/ui/components/ui/button'
import {
  EmptyResult,
  SelectWithSearch,
  SelectWithSearchProps,
} from '@repo/ui/components/ui/select-with-search'
import { UseMutationResult } from '@tanstack/react-query'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { useState } from 'react'

interface SelectWithSearchWithCreateProps extends SelectWithSearchProps {
  entityName: string
  createMutation?: UseMutationResult<
    { id: string } | undefined,
    Error,
    { name: string }
  >
}

const CreateButton = ({
  entityName,
  createMutation,
  searchValue,
  setOpen,
  ...props
}: SelectWithSearchWithCreateProps & {
  searchValue: string | null
  setOpen: (open: boolean) => void
}) => {
  if (!searchValue || !createMutation) return <EmptyResult />

  return (
    <Button
      onClick={async () => {
        const newOption = await createMutation.mutateAsync({
          name: searchValue,
        })
        if (newOption) {
          props.onSelect(newOption.id)
        }
        setOpen(false)
      }}
      disabled={createMutation.isPending}
    >
      {createMutation.isPending && <LoadingIcon />}
      {`Create ${entityName} "${searchValue}"`}
    </Button>
  )
}

export const SelectWithSearchWithCreate = ({
  createMutation,
  ...props
}: SelectWithSearchWithCreateProps) => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState<string>('')

  return (
    <SelectWithSearch
      {...props}
      open={open}
      setOpen={setOpen}
      noResult={
        <CreateButton
          createMutation={createMutation}
          searchValue={searchValue}
          setOpen={setOpen}
          {...props}
        />
      }
      onSearch={(value) => {
        setSearchValue(value ?? '')
        props.onSearch(value)
      }}
    />
  )
}
