import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { ReportsBreadcrumbs } from './_components/breadcrumbs'

const ProductLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<ReportsBreadcrumbs />}>{children}</DetailLayout>
  )
}

export default ProductLayout
