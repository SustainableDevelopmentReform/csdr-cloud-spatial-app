import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { DatasetBreadcrumbs } from '../datasets/_components/breadcrumbs'

const DatasetLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<DatasetBreadcrumbs />}>{children}</DetailLayout>
  )
}

export default DatasetLayout
