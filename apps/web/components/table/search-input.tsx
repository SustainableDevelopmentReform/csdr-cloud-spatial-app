import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@repo/ui/components/ui/input-group'
import { Search } from 'lucide-react'
import { ChangeEventHandler } from 'react'
import { useDebounceCallback } from 'usehooks-ts'
import { cn } from '@repo/ui/lib/utils'

interface SearchInputProps {
  className?: string
  placeholder: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  debounce?: number
}

export const SearchInput = ({
  className,
  placeholder,
  value,
  onChange,
  debounce = 300,
}: SearchInputProps) => {
  const debounced = useDebounceCallback(onChange, debounce)

  return (
    <InputGroup className={cn('max-w-sm', className)}>
      <InputGroupInput
        placeholder={placeholder}
        defaultValue={value}
        onChange={debounced}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
  )
}
