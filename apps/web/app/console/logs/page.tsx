import PageAuthGuard from '~/components/page-auth-guard'
import LogsPageClient from './client'

export default () => {
  return (
    <PageAuthGuard roles={['org_admin', 'super_admin']}>
      <LogsPageClient />
    </PageAuthGuard>
  )
}
