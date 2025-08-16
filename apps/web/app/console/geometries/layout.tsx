import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { GeometriesBreadcrumbs } from './_components/breadcrumbs'

const GeometriesLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<GeometriesBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default GeometriesLayout
