import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { WorkflowBreadcrumbs } from './_components/breadcrumbs'

const WorkflowLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<WorkflowBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default WorkflowLayout
