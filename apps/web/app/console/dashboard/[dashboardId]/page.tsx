import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'

export default function DashboardDetailPage() {
  return (
    <PageAuthGuard>
      <ClientPage />
    </PageAuthGuard>
  )
}
