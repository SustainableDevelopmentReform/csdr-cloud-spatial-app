import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { MeBreadcrumbs } from './_components/breadcrumbs'

const MeLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return <DetailLayout breadcrumbs={<MeBreadcrumbs />}>{children}</DetailLayout>
}

export default MeLayout
