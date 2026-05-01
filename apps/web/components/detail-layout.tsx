'use client'

import React from 'react'
import {
  useSelectedLayoutSegment,
  useSelectedLayoutSegments,
} from 'next/navigation'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import { cn } from '@repo/ui/lib/utils'

const focusedTableSegments = new Set(['api-keys', 'outputs', 'runs'])

const DetailLayout: React.FC<{
  children?: React.ReactNode
  breadcrumbs?: React.ReactNode
  showHeaderOnIndex?: boolean
}> = ({ children, breadcrumbs, showHeaderOnIndex = true }) => {
  const selectedLayoutSegment = useSelectedLayoutSegment()
  const selectedLayoutSegments = useSelectedLayoutSegments()
  const shouldShowHeader = showHeaderOnIndex || selectedLayoutSegment !== null
  const isFocusedTableRoute = selectedLayoutSegments.some((segment) =>
    focusedTableSegments.has(segment),
  )
  const shouldConstrainContent =
    selectedLayoutSegments.length > 0 && !isFocusedTableRoute

  return (
    <main className={cn('w-full', shouldConstrainContent && 'max-w-[800px]')}>
      {shouldShowHeader && breadcrumbs ? (
        <ConsolePageHeader breadcrumbs={breadcrumbs} />
      ) : null}
      <div className={shouldShowHeader ? 'pt-4' : undefined}>{children}</div>
    </main>
  )
}

export default DetailLayout
