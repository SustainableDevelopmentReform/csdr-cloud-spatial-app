import { notFound } from 'next/navigation'
import { getUserServerSession } from '../utils/getUserServerSession'

const PageAuthGuard = async ({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: string[]
}) => {
  const { user } = await getUserServerSession()

  if (!user || (roles && !roles.includes(user.role ?? ''))) {
    return notFound()
  }

  return children
}

export default PageAuthGuard
