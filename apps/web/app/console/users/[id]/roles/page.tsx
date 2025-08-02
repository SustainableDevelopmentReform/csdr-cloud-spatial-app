import { notFound } from 'next/navigation'
// import UserRoleManagement from './client'

const Page = async () => {
  return notFound()
  // const { user } = await getUserServerSession()

  // const isGranted = user?.role === 'admin'

  // if (!isGranted) {

  // }

  // return <UserRoleManagement />
}

export default Page
