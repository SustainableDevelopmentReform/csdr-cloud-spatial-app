'use client'

import { Separator } from '@repo/ui/components/ui/separator'
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
        'flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="hidden h-4 md:block" />
        <div className="min-w-0 flex-1">{breadcrumbs}</div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
