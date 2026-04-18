import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { IndicatorsBreadcrumbs } from './_components/breadcrumbs'

const IndicatorLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout
      breadcrumbs={<IndicatorsBreadcrumbs />}
      showHeaderOnIndex={false}
    >
      {children}
    </DetailLayout>
  )
}

export default IndicatorLayout
