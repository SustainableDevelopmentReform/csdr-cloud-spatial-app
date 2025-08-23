'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@repo/ui/lib/utils'
import { Button } from '@repo/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'

interface SelectWithSearchProps {
  options?: { id: string; name?: string }[]
  value: string
  onSearch: (value: string) => void
  onSelect: (value: string) => void
  placeholder?: string
  className?: string
}

export function SelectWithSearch({
  options,
  value,
  onSearch,
  onSelect,
  placeholder = 'Select an option',
  className,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? (options?.find((option) => option.id === value)?.name ??
              options?.find((option) => option.id === value)?.id)
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', className)}>
        <Command className="w-full">
          <CommandInput
            placeholder={placeholder}
            className="h-9"
            onValueChange={onSearch}
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options?.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                >
                  {option.name ?? option.id}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === option.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
