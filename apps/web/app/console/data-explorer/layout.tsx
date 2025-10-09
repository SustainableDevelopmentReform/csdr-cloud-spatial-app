import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { ProductExplorerBreadcrumbs } from './_components/breadcrumbs'

const ProductLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<ProductExplorerBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default ProductLayout
