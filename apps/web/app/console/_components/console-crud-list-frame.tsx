'use client'

import { cn } from '@repo/ui/lib/utils'
import React from 'react'

type ConsoleCrudListFrameProps = {
  title: string
  description: string
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const ConsoleCrudListFrame = ({
  title,
  description,
  actions,
  toolbar,
  children,
  className,
}: ConsoleCrudListFrameProps) => {
  return (
    <section
      className={cn('overflow-hidden rounded-[10px] bg-white', className)}
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[720px] flex-1 space-y-1">
            <h1 className="text-xl font-semibold leading-7 text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {toolbar}
      </div>
      <div className="flex flex-col gap-6 px-6 pb-6">{children}</div>
    </section>
  )
}
