import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { ReportBreadcrumbs } from './_components/breadcrumbs'

const ReportLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<ReportBreadcrumbs />} showHeaderOnIndex={false}>
      {children}
    </DetailLayout>
  )
}

export default ReportLayout
