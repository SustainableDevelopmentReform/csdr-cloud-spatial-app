import { notFound } from 'next/navigation'
import { getUserServerSession } from '~/utils/getUserServerSession'
import UserProfile from './client'

const Page = async () => {
  const { user } = await getUserServerSession()

  const isGranted = user?.role === 'admin'

  if (!isGranted) {
    return notFound()
  }

  return <UserProfile />
}

export default Page
