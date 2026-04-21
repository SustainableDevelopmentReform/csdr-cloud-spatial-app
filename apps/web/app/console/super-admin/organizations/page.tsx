import PageAuthGuard from '~/components/page-auth-guard'
import SuperAdminOrganizationsPageClient from './client'

export default () => {
  return (
    <PageAuthGuard roles={['super_admin']}>
      <SuperAdminOrganizationsPageClient />
    </PageAuthGuard>
  )
}
