import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from '../data-library/client'

export default () => {
  return (
    <PageAuthGuard allowAnonymous>
      <ClientPage />
    </PageAuthGuard>
  )
}
