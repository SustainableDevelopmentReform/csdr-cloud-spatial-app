import { notFound } from 'next/navigation'
import { getUserServerSession } from '../utils/getUserServerSession'
import { buildSessionAccess, roleMatches } from '../utils/access-control'

const PageAuthGuard = async ({
  children,
  roles,
  allowAnonymous = false,
}: {
  children: React.ReactNode
  allowAnonymous?: boolean
  roles?: string[]
}) => {
  const { user, activeMember, activeOrganization } =
    await getUserServerSession()
  const access = buildSessionAccess({
    user,
    activeMember,
    activeOrganization,
  })

  if (!user) {
    if (allowAnonymous) {
      return children
    }

    return notFound()
  }

  if (roles && !roles.some((role) => roleMatches(access, role))) {
    return notFound()
  }

  return children
}

export default PageAuthGuard
