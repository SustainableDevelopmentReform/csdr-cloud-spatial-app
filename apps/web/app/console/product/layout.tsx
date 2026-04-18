import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { ProductsBreadcrumbs } from './_components/breadcrumbs'

const ProductLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout
      breadcrumbs={<ProductsBreadcrumbs />}
      showHeaderOnIndex={false}
    >
      {children}
    </DetailLayout>
  )
}

export default ProductLayout
