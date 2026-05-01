import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'

export default () => {
  return (
    <PageAuthGuard allowAnonymous>
      <ClientPage />
    </PageAuthGuard>
  )
}
