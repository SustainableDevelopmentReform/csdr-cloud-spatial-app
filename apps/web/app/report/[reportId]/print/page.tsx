import { env } from '~/env'
import { REPORTS_BASE_PATH } from '~/lib/paths'
import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'

export default async ({
  params,
}: {
  params: Promise<{ reportId: string }>
}) => {
  const { reportId } = await params
  const reportUrl = new URL(
    `${REPORTS_BASE_PATH}/${reportId}`,
    env.APP_URL,
  ).toString()

  return (
    <PageAuthGuard allowAnonymous>
      <ClientPage reportId={reportId} reportUrl={reportUrl} />
    </PageAuthGuard>
  )
}
