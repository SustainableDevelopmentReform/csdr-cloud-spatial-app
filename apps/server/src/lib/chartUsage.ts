import {
  extractChartIndicatorSelection,
  type ChartIndicatorSelection,
} from '@repo/schemas/chart'
import { type DashboardContent } from '@repo/schemas/crud'
import {
  extractReportChartReferences,
  parseNullableReportStoredContent,
} from '@repo/schemas/report-content'
import { and, eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { dashboardIndicatorUsage, reportIndicatorUsage } from '~/schemas/db'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type IndicatorUsageRow = {
  productRunId: string
  indicatorId: string | null
  derivedIndicatorId: string | null
}

const toUniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values))

const toIndicatorUsageKey = (usage: IndicatorUsageRow): string =>
  [
    usage.productRunId,
    usage.indicatorId ?? '',
    usage.derivedIndicatorId ?? '',
  ].join(':')

const getReportIndicatorSelections = (
  content: unknown,
): ChartIndicatorSelection[] => {
  const parsedContent = parseNullableReportStoredContent(content)

  if (!parsedContent) {
    return []
  }

  return extractReportChartReferences(parsedContent).map(({ chart }) =>
    extractChartIndicatorSelection(chart),
  )
}

const getDashboardIndicatorSelections = (
  content: DashboardContent,
): ChartIndicatorSelection[] =>
  Object.values(content.charts).map((chart) =>
    extractChartIndicatorSelection(chart),
  )

const resolveIndicatorUsages = async (
  tx: DbTransaction,
  indicatorSelections: ChartIndicatorSelection[],
): Promise<IndicatorUsageRow[]> => {
  const selectedIndicatorIds = toUniqueStrings(
    indicatorSelections.flatMap((selection) => selection.indicatorIds),
  )

  if (selectedIndicatorIds.length === 0) {
    return []
  }

  const measuredIndicatorIds = (
    await tx.query.indicator.findMany({
      columns: { id: true },
      where: (table, { inArray }) => inArray(table.id, selectedIndicatorIds),
    })
  ).map((entry) => entry.id)

  const derivedIndicatorIds = (
    await tx.query.derivedIndicator.findMany({
      columns: { id: true },
      where: (table, { inArray }) => inArray(table.id, selectedIndicatorIds),
    })
  ).map((entry) => entry.id)

  const measuredIndicatorIdSet = new Set(measuredIndicatorIds)
  const derivedIndicatorIdSet = new Set(derivedIndicatorIds)
  const resolvedUsages = new Map<string, IndicatorUsageRow>()

  for (const selection of indicatorSelections) {
    for (const selectedIndicatorId of selection.indicatorIds) {
      const isMeasuredIndicator =
        measuredIndicatorIdSet.has(selectedIndicatorId)
      const isDerivedIndicator = derivedIndicatorIdSet.has(selectedIndicatorId)

      if (isMeasuredIndicator === isDerivedIndicator) {
        continue
      }

      const usage = isMeasuredIndicator
        ? {
            productRunId: selection.productRunId,
            indicatorId: selectedIndicatorId,
            derivedIndicatorId: null,
          }
        : {
            productRunId: selection.productRunId,
            indicatorId: null,
            derivedIndicatorId: selectedIndicatorId,
          }

      resolvedUsages.set(
        toIndicatorUsageKey(usage),
        usage satisfies IndicatorUsageRow,
      )
    }
  }

  return Array.from(resolvedUsages.values())
}

const replaceReportIndicatorUsages = async (
  tx: DbTransaction,
  reportId: string,
  indicatorUsages: IndicatorUsageRow[],
): Promise<void> => {
  await tx
    .delete(reportIndicatorUsage)
    .where(eq(reportIndicatorUsage.reportId, reportId))

  if (indicatorUsages.length === 0) {
    return
  }

  await tx.insert(reportIndicatorUsage).values(
    indicatorUsages.map((usage) => ({
      reportId,
      productRunId: usage.productRunId,
      indicatorId: usage.indicatorId,
      derivedIndicatorId: usage.derivedIndicatorId,
    })),
  )
}

const replaceDashboardIndicatorUsages = async (
  tx: DbTransaction,
  dashboardId: string,
  indicatorUsages: IndicatorUsageRow[],
): Promise<void> => {
  await tx
    .delete(dashboardIndicatorUsage)
    .where(eq(dashboardIndicatorUsage.dashboardId, dashboardId))

  if (indicatorUsages.length === 0) {
    return
  }

  await tx.insert(dashboardIndicatorUsage).values(
    indicatorUsages.map((usage) => ({
      dashboardId,
      productRunId: usage.productRunId,
      indicatorId: usage.indicatorId,
      derivedIndicatorId: usage.derivedIndicatorId,
    })),
  )
}

export const syncReportChartUsages = async (
  tx: DbTransaction,
  reportId: string,
  content: unknown,
): Promise<void> => {
  const indicatorUsages = await resolveIndicatorUsages(
    tx,
    getReportIndicatorSelections(content),
  )

  await replaceReportIndicatorUsages(tx, reportId, indicatorUsages)
}

export const syncDashboardChartUsages = async (
  tx: DbTransaction,
  dashboardId: string,
  content: DashboardContent,
): Promise<void> => {
  const indicatorUsages = await resolveIndicatorUsages(
    tx,
    getDashboardIndicatorSelections(content),
  )

  await replaceDashboardIndicatorUsages(tx, dashboardId, indicatorUsages)
}

export const ensureMeasuredIndicatorNotUsedByCharts = async (
  indicatorId: string,
): Promise<void> => {
  const usage = await Promise.all([
    db.query.reportIndicatorUsage.findFirst({
      columns: { reportId: true },
      where: (table, { eq }) => eq(table.indicatorId, indicatorId),
    }),
    db.query.dashboardIndicatorUsage.findFirst({
      columns: { dashboardId: true },
      where: (table, { eq }) => eq(table.indicatorId, indicatorId),
    }),
  ])

  if (usage[0] || usage[1]) {
    throw new ServerError({
      statusCode: 400,
      message: 'Cannot delete measured indicator',
      description:
        'This measured indicator is used by a report or dashboard chart.',
    })
  }
}

export const ensureDerivedIndicatorNotUsedByCharts = async (
  derivedIndicatorId: string,
): Promise<void> => {
  const usage = await Promise.all([
    db.query.reportIndicatorUsage.findFirst({
      columns: { reportId: true },
      where: (table, { eq }) =>
        eq(table.derivedIndicatorId, derivedIndicatorId),
    }),
    db.query.dashboardIndicatorUsage.findFirst({
      columns: { dashboardId: true },
      where: (table, { eq }) =>
        eq(table.derivedIndicatorId, derivedIndicatorId),
    }),
  ])

  if (usage[0] || usage[1]) {
    throw new ServerError({
      statusCode: 400,
      message: 'Cannot delete derived indicator',
      description:
        'This derived indicator is used by a report or dashboard chart.',
    })
  }
}

export const ensureAssignedDerivedIndicatorNotUsedByCharts = async (
  productRunId: string,
  derivedIndicatorId: string,
): Promise<void> => {
  const usage = await Promise.all([
    db.query.reportIndicatorUsage.findFirst({
      columns: { reportId: true },
      where: (table, { and, eq }) =>
        and(
          eq(table.productRunId, productRunId),
          eq(table.derivedIndicatorId, derivedIndicatorId),
        ),
    }),
    db.query.dashboardIndicatorUsage.findFirst({
      columns: { dashboardId: true },
      where: (table, { and, eq }) =>
        and(
          eq(table.productRunId, productRunId),
          eq(table.derivedIndicatorId, derivedIndicatorId),
        ),
    }),
  ])

  if (usage[0] || usage[1]) {
    throw new ServerError({
      statusCode: 400,
      message: 'Cannot delete derived indicator',
      description:
        'This derived indicator is used by a report or dashboard chart.',
    })
  }
}

export const ensureProductRunNotUsedByCharts = async (
  productRunId: string,
): Promise<void> => {
  const usage = await Promise.all([
    db.query.reportIndicatorUsage.findFirst({
      columns: { reportId: true },
      where: (table, { eq }) => eq(table.productRunId, productRunId),
    }),
    db.query.dashboardIndicatorUsage.findFirst({
      columns: { dashboardId: true },
      where: (table, { eq }) => eq(table.productRunId, productRunId),
    }),
  ])

  if (usage[0] || usage[1]) {
    throw new ServerError({
      statusCode: 400,
      message: 'Cannot delete product run',
      description: 'This product run is used by a report or dashboard chart.',
    })
  }
}
