import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { WorkflowsBreadcrumbs } from './_components/breadcrumbs'

const WorkflowsLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<WorkflowsBreadcrumbs />}>
      {children}
    </DetailLayout>
  )
}

export default WorkflowsLayout
