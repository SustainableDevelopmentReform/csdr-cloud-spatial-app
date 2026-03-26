import PageAuthGuard from '~/components/page-auth-guard'
import WorkspacePageClient from './client'

export default () => {
  return (
    <PageAuthGuard roles={['org_admin', 'super_admin']}>
      <WorkspacePageClient />
    </PageAuthGuard>
  )
}
