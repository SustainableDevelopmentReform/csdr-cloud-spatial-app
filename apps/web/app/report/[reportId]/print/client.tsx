'use client'

import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'
import { reportChartFormBuilder } from '~/app/console/report/_components/report-chart-editor'
import { ReportSources } from '~/app/console/report/_components/report-sources'
import { useReport } from '~/app/console/report/_hooks'

const ReportPrintPage = ({
  reportId,
  reportUrl,
}: {
  reportId: string
  reportUrl: string
}) => {
  const reportQuery = useReport(reportId)
  const report = reportQuery.data
  const formBuilder = useMemo(() => reportChartFormBuilder(() => {}), [])

  if (reportQuery.isLoading) {
    return (
      <main className="mx-auto max-w-[800px] px-8 py-10 text-sm text-muted-foreground">
        Loading report…
      </main>
    )
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-[800px] px-8 py-10 text-sm text-muted-foreground">
        Report not found.
      </main>
    )
  }

  return (
    <main
      className="mx-auto flex max-w-[800px] flex-col gap-8 px-8 py-10"
      data-report-print-ready="true"
    >
      <section>
        <SimpleEditor
          editable={false}
          content={report.content}
          chartFormBuilder={formBuilder}
          onUpdate={() => {}}
        />
      </section>

      <section>
        <ReportSources sources={report.sources} />
      </section>

      <section className="break-before-page border-t border-gray-200 pt-8">
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
          <div className="flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <QRCodeSVG size={180} value={reportUrl} />
            </div>
          </div>
          <div className="grid gap-3">
            <h2 className="text-2xl font-semibold">Open This Report Online</h2>
            <p className="text-sm text-muted-foreground">
              Scan this QR code to open the live report in the web app.
            </p>
            <p className="break-all rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {reportUrl}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default ReportPrintPage
