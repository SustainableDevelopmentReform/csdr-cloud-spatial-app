import PageAuthGuard from '~/components/page-auth-guard'
import SuperAdminAuditLogsPageClient from './client'

export default () => {
  return (
    <PageAuthGuard roles={['super_admin']}>
      <SuperAdminAuditLogsPageClient />
    </PageAuthGuard>
  )
}
