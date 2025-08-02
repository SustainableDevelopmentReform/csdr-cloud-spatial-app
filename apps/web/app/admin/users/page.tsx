import React from 'react'
import UserFeature from './client'
import { getUserServerSession } from '~/utils/getUserServerSession'
import { notFound } from 'next/navigation'

const Page = async () => {
  const { user } = await getUserServerSession()

  const isGranted = user?.role === 'admin'

  if (!isGranted) {
    return notFound()
  }

  return <UserFeature />
}

export default Page
