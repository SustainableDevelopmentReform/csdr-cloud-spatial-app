import { notFound } from 'next/navigation'

const Page = async () => {
  return notFound()
  // const { user } = await getUserServerSession()

  // const isGranted = user?.role === 'admin'

  // if (!isGranted) {
  //   return notFound()
  // }

  // return <OrganizationUserList />
}

export default Page
