import { notFound } from 'next/navigation'
import { getUserServerSession } from '~/utils/getUserServerSession'

const Page = async () => {
  const { user } = await getUserServerSession()

  if (!user) {
    return notFound()
  }

  return (
    <div className="">
      <div>Hello {user?.name}</div>
    </div>
  )
}

export default Page
