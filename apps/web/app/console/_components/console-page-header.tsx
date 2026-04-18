'use client'

import { SidebarTrigger } from '@repo/ui/components/ui/sidebar'
import { cn } from '@repo/ui/lib/utils'
import React from 'react'

type ConsolePageHeaderProps = {
  breadcrumbs: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const ConsolePageHeader = ({
  breadcrumbs,
  actions,
  className,
}: ConsolePageHeaderProps) => {
  return (
    <header
      className={cn(
        'flex min-h-16 flex-wrap items-center gap-3 px-4 md:flex-nowrap md:gap-0',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="size-7 shrink-0 rounded-lg text-stone-900 hover:bg-transparent hover:text-stone-900 [&>svg]:size-4" />
        <div className="flex w-2 items-center justify-start">
          <div className="relative h-3.5 w-0">
            <div className="absolute inset-y-0 left-0 border-l border-neutral-200" />
          </div>
        </div>
        <div className="min-w-0">{breadcrumbs}</div>
      </div>
      {actions ? (
        <div className="flex flex-1 items-start justify-end gap-2.5">
          <div className="flex flex-1 items-center justify-end gap-2">
            {actions}
          </div>
        </div>
      ) : null}
    </header>
  )
}
