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

export type SelectWithSearchProps = {
  options?: { id: string; name?: string }[]
  onSearch: (value: string | null) => void
  placeholder?: string
  allowUndefined?: boolean
  className?: string
  noResult?: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
  disabled?: boolean
} & (
  | {
      value: string[]
      onSelect: (value: string[]) => void
      multiple: true
    }
  | {
      value: string | null
      onSelect: (value: string | null) => void
      multiple?: false
    }
)

export function EmptyResult() {
  return 'No options found.'
}

export function SelectWithSearch({
  options,
  onSearch,
  placeholder = 'Select an option',
  allowUndefined,
  className,
  noResult,
  open: openProp,
  setOpen: setOpenProp,
  disabled,
  ...props
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false)

  const selectedValues = props.multiple ? props.value : [props.value]

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
          <div className="flex flex-wrap gap-2 max-w-full overflow-x-hidden">
            {selectedValues.length > 0
              ? selectedValues
                  .map(
                    (value) =>
                      options?.find((option) => option.id === value)?.name ??
                      value,
                  )
                  .join(', ')
              : placeholder}
          </div>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-0 w-[--radix-popper-anchor-width] max-w-full overflow-x-hidden',
          className,
        )}
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
                    props.multiple ? props.onSelect([]) : props.onSelect(null)
                    setOpenProp?.(false) || setOpen(false)
                  }}
                >
                  {placeholder}
                  <Check
                    className={cn(
                      'ml-auto',
                      props.value === null ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              )}
              {options?.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={(currentValue) => {
                    props.multiple
                      ? props.onSelect(
                          props.value.includes(currentValue)
                            ? props.value.filter(
                                (value) => value !== currentValue,
                              )
                            : [...props.value, currentValue],
                        )
                      : props.onSelect(
                          currentValue === props.value ? null : currentValue,
                        )
                    setOpenProp?.(false) || setOpen(false)
                  }}
                >
                  {option.name ?? option.id}
                  <Check
                    className={cn(
                      'ml-auto',
                      props.multiple
                        ? props.value.includes(option.id)
                          ? 'opacity-100'
                          : 'opacity-0'
                        : props.value === option.id
                          ? 'opacity-100'
                          : 'opacity-0',
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
