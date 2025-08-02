import { notFound } from 'next/navigation'
import { getUserServerSession } from '~/utils/getUserServerSession'
import AdminLayout from './_components/admin-layout'

const Page = async () => {
  const { user } = await getUserServerSession()

  const isGranted = user?.role === 'admin'

  if (!isGranted) {
    return notFound()
  }

  return (
    <AdminLayout>
      <div className="text-2xl font-semibold">
        <div>Hi {user?.name},</div>
        <div>Welcome to Admin Dashboard</div>
      </div>
    </AdminLayout>
  )
}

export default Page
