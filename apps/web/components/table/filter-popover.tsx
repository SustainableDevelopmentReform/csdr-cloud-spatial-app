'use client'

import { Button } from '@repo/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'
import { cn } from '@repo/ui/lib/utils'
import { ListFilter, X } from 'lucide-react'
import React from 'react'

export type ActiveTableFilter = {
  id: string
  label: string
  value?: string
  onClear?: () => void
}

type TableFilterPopoverProps = {
  activeFilters?: ActiveTableFilter[]
  children: React.ReactNode
  className?: string
}

export const TableFilterPopover = ({
  activeFilters = [],
  children,
  className,
}: TableFilterPopoverProps) => {
  const activeCount = activeFilters.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 rounded-lg px-4 py-2 text-sm leading-5 shadow-xs',
            activeCount > 0 &&
              'border-primary/30 bg-primary/5 hover:bg-primary/10',
            className,
          )}
        >
          <ListFilter className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs leading-none text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(28rem,calc(100vw-2rem))] rounded-lg"
      >
        <div className="flex flex-col gap-4">
          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground"
                >
                  <span className="truncate">
                    {filter.label}
                    {filter.value ? `: ${filter.value}` : null}
                  </span>
                  {filter.onClear ? (
                    <button
                      type="button"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={filter.onClear}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Clear {filter.label}</span>
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No filters applied.
            </div>
          )}
          <div className="grid gap-3">{children}</div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
