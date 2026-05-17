import { extractReportChartReferences } from '@repo/schemas/report-content'
import { inArray } from 'drizzle-orm'
import { db } from './db'
import { productRun } from '~/schemas/db'
import { validatePmtilesUrl } from './url-security'

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values))

export const assertReportPmtilesUrlsAllowed = async (
  content: unknown,
): Promise<void> => {
  if (content === null) {
    return
  }

  const mapProductRunIds = uniqueStrings(
    extractReportChartReferences(content)
      .map((reference) => reference.chart)
      .filter((chart) => chart.type === 'map')
      .map((chart) => chart.productRunId),
  )

  if (mapProductRunIds.length === 0) {
    return
  }

  const productRuns = await db.query.productRun.findMany({
    where: inArray(productRun.id, mapProductRunIds),
    columns: {
      id: true,
    },
    with: {
      geometriesRun: {
        columns: {
          dataPmtilesUrl: true,
        },
      },
    },
  })
  const productRunsById = new Map(productRuns.map((run) => [run.id, run]))

  for (const productRunId of mapProductRunIds) {
    const currentProductRun = productRunsById.get(productRunId)

    validatePmtilesUrl(currentProductRun?.geometriesRun?.dataPmtilesUrl)
  }
}
