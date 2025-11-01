'use client'

import { InputActionMeta, GroupBase } from 'react-select'

import CreatableSelect, { CreatableProps } from 'react-select/creatable'

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
} & CreatableProps<Option, IsMulti, GroupBase<Option>>

export function EmptyResult() {
  return 'No options found.'
}

export function SelectWithSearchWithCreate<
  Option extends SelectOption,
  IsMulti extends boolean = false,
>({ onSearch, ...rest }: SelectWithSearchProps<Option, IsMulti>) {
  const handleInputChange = (inputText: string, meta: InputActionMeta) => {
    if (meta.action !== 'input-blur' && meta.action !== 'menu-close') {
      onSearch?.(inputText)
    }
  }

  return (
    <CreatableSelect<Option, IsMulti>
      getOptionLabel={(option) => {
        // Need to handle the create label (from formatCreateLabel)
        if (
          !option.id &&
          'label' in option &&
          typeof option.label === 'string'
        ) {
          return option.label
        }
        return option.name ?? option.id
      }}
      getOptionValue={(option) => option.id}
      formatCreateLabel={(input) => `Create "${input}"`}
      {...rest}
      onInputChange={handleInputChange}
    />
  )
}
