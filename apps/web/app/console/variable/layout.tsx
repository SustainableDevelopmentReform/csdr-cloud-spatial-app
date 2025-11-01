import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { VariablesBreadcrumbs } from './_components/breadcrumbs'

const ProductLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<VariablesBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default ProductLayout
