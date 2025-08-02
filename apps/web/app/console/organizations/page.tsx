import { notFound } from 'next/navigation'

const Page = async () => {
  return notFound()
  // const { user } = await getUserServerSession()

  // const isGranted = user?.role === 'admin'

  // if (!isGranted) {
  //   return notFound()
  // }

  // return <OrganizationFeature />
}

export default Page
