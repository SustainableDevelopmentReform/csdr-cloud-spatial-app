import PageAuthGuard from '~/components/page-auth-guard'
import UserFeature from './client'

export default () => {
  return (
    <PageAuthGuard roles={['admin']}>
      <UserFeature />
    </PageAuthGuard>
  )
}
