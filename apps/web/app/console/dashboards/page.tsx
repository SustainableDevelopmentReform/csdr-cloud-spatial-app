import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'

export default function DashboardsPage() {
  return (
    <PageAuthGuard>
      <ClientPage />
    </PageAuthGuard>
  )
}
