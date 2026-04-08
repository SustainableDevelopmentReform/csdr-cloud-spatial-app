import { env } from '~/env'
import { REPORTS_BASE_PATH } from '~/lib/paths'
import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'

export default ({ params }: { params: { reportId: string } }) => {
  const reportUrl = new URL(
    `${REPORTS_BASE_PATH}/${params.reportId}`,
    env.APP_URL,
  ).toString()

  return (
    <PageAuthGuard allowAnonymous>
      <ClientPage reportId={params.reportId} reportUrl={reportUrl} />
    </PageAuthGuard>
  )
}
