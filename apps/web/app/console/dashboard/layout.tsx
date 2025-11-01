import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { DashboardBreadcrumbs } from './_components/breadcrumbs'

const DashboardLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<DashboardBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default DashboardLayout
