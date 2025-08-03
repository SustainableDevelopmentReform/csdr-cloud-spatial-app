import { notFound } from 'next/navigation'
import { getUserServerSession } from '../../../utils/getUserServerSession'
import DatasetFeature from './client'

const Page = async () => {
  const { user } = await getUserServerSession()

  if (!user) {
    return notFound()
  }

  return <DatasetFeature />
}

export default Page
