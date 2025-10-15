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

export interface SelectWithSearchProps {
  options?: { id: string; name?: string }[]
  value: string | null
  onSearch: (value: string | null) => void
  onSelect: (value: string | null) => void
  placeholder?: string
  allowUndefined?: boolean
  className?: string
  noResult?: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
  disabled?: boolean
}

export function EmptyResult() {
  return 'No options found.'
}

export function SelectWithSearch({
  options,
  value,
  onSearch,
  onSelect,
  placeholder = 'Select an option',
  allowUndefined,
  className,
  noResult,
  open: openProp,
  setOpen: setOpenProp,
  disabled,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false)

  console.log(
    options?.find((option) => option.id === value),
    options,
    value,
  )

  return (
    <Popover open={openProp ?? open} onOpenChange={setOpenProp ?? setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openProp ?? open}
          className="w-full justify-between"
          animate={false}
          disabled={disabled}
        >
          {value
            ? (options?.find((option) => option.id === value)?.name ??
              options?.find((option) => option.id === value)?.id)
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0 w-[--radix-popper-anchor-width]', className)}
      >
        <Command className="w-full">
          <CommandInput
            placeholder={placeholder}
            className="h-9"
            onValueChange={onSearch}
          />
          <CommandList>
            <CommandEmpty>{noResult ?? <EmptyResult />}</CommandEmpty>
            <CommandGroup>
              {allowUndefined && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onSelect('')
                    setOpenProp?.(false) || setOpen(false)
                  }}
                >
                  {placeholder}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === null ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              )}
              {options?.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? '' : currentValue)
                    setOpenProp?.(false) || setOpen(false)
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
