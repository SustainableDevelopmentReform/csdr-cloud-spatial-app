import React from 'react'

const DetailLayout: React.FC<{
  children?: React.ReactNode
  breadcrumbs?: React.ReactNode
}> = async ({ children, breadcrumbs }) => {
  return (
    <main>
      <div className="flex items-center justify-start gap-4">{breadcrumbs}</div>
      <div className="pt-4">{children}</div>
    </main>
  )
}

export default DetailLayout
