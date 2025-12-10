import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { IndicatorsBreadcrumbs } from './_components/breadcrumbs'

const ProductLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<IndicatorsBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default ProductLayout
