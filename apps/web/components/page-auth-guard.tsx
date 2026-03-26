import { notFound } from 'next/navigation'
import { getUserServerSession } from '../utils/getUserServerSession'
import { buildSessionAccess, roleMatches } from '../utils/access-control'

const PageAuthGuard = async ({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: string[]
}) => {
  const { user, activeMember, activeOrganization } =
    await getUserServerSession()
  const access = buildSessionAccess({
    user,
    activeMember,
    activeOrganization,
  })

  if (!user || (roles && !roles.some((role) => roleMatches(access, role)))) {
    return notFound()
  }

  return children
}

export default PageAuthGuard
