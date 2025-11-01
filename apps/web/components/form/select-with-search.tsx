'use client'

import ReactSelect, {
  InputActionMeta,
  Props as ReactSelectProps,
} from 'react-select'

export type SelectOption = {
  id: string
  name?: string
}

export type SelectWithSearchProps<
  Option extends SelectOption,
  IsMulti extends boolean = false,
> = {
  onSearch?: (value: string | undefined) => void
  options: Option[] | undefined
} & ReactSelectProps<Option, IsMulti>

export function EmptyResult() {
  return 'No options found.'
}

export function SelectWithSearch<
  Option extends SelectOption,
  IsMulti extends boolean = false,
>({ onSearch, ...rest }: SelectWithSearchProps<Option, IsMulti>) {
  const handleInputChange = (inputText: string, meta: InputActionMeta) => {
    if (meta.action !== 'input-blur' && meta.action !== 'menu-close') {
      onSearch?.(inputText)
    }
  }

  return (
    <ReactSelect<Option, IsMulti>
      getOptionLabel={(option) => option.name ?? option.id}
      getOptionValue={(option) => option.id}
      {...rest}
      onInputChange={handleInputChange}
    />
  )
}
