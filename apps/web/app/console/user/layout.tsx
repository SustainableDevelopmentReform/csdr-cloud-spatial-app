import React from 'react'
import DetailLayout from '../../../components/detail-layout'
import { UserBreadcrumbs } from './_components/breadcrumbs'

const UserDetailLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <DetailLayout breadcrumbs={<UserBreadcrumbs />}>{children}</DetailLayout>
  )
}

export default UserDetailLayout
