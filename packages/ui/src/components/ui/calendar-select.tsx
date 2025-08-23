'use client'

import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { Calendar } from '@repo/ui/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'

export function CalendarSelect({
  value,
  onChange,
}: {
  label: string
  value: Date
  onChange: (date: Date | undefined) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {value ? value.toLocaleDateString() : 'Select date'}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            captionLayout="dropdown"
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
