'use client'

import { cn } from '@repo/ui/lib/utils'
import React from 'react'

type TableShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export const TableShell = ({
  title,
  description,
  actions,
  toolbar,
  footer,
  children,
  className,
  contentClassName,
}: TableShellProps) => {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[10px] bg-card text-card-foreground',
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[720px] flex-1 space-y-1">
          <h1 className="text-xl font-semibold leading-7 text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {toolbar || actions ? (
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end md:gap-2">
            {toolbar}
            {actions ? (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={cn('p-6', contentClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-border px-6 py-4">{footer}</div>
      ) : null}
    </section>
  )
}
