'use client'

import React from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'

const DetailLayout: React.FC<{
  children?: React.ReactNode
  breadcrumbs?: React.ReactNode
  showHeaderOnIndex?: boolean
}> = ({ children, breadcrumbs, showHeaderOnIndex = true }) => {
  const selectedLayoutSegment = useSelectedLayoutSegment()
  const shouldShowHeader = showHeaderOnIndex || selectedLayoutSegment !== null

  return (
    <main>
      {shouldShowHeader && breadcrumbs ? (
        <ConsolePageHeader breadcrumbs={breadcrumbs} />
      ) : null}
      <div className={shouldShowHeader ? 'pt-4' : undefined}>{children}</div>
    </main>
  )
}

export default DetailLayout
