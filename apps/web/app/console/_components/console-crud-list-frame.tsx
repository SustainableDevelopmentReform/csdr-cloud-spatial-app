'use client'

import { cn } from '@repo/ui/lib/utils'
import React from 'react'
import { TableShell } from '~/components/table/table-shell'

type ConsoleCrudListFrameProps = {
  title: string
  description: string
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export const ConsoleCrudListFrame = ({
  title,
  description,
  actions,
  toolbar,
  footer,
  children,
  className,
  contentClassName,
}: ConsoleCrudListFrameProps) => {
  return (
    <TableShell
      title={title}
      description={description}
      actions={actions}
      toolbar={toolbar}
      footer={footer}
      className={cn(className)}
      contentClassName={cn('flex flex-col gap-6', contentClassName)}
    >
      {children}
    </TableShell>
  )
}
