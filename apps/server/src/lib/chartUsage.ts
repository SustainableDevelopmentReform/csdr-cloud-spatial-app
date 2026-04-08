import {
  extractChartIndicatorSelection,
  type ChartConfiguration,
  type ChartIndicatorSelection,
} from '@repo/schemas/chart'
import { type DashboardContent } from '@repo/schemas/crud'
import {
  extractReportChartReferences,
  parseNullableReportStoredContent,
} from '@repo/schemas/report-content'
import { and, eq, exists, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { buildExtentEnvelopeSql } from '~/lib/geographicBounds'
import {
  dashboard,
  dashboardIndicatorUsage,
  datasetRun,
  geometriesRun,
  geometryOutput,
  productRun,
  report,
  reportIndicatorUsage,
} from '~/schemas/db'
import { normalizeFilterValues } from '~/utils/query'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type IndicatorUsageRow = {
  productRunId: string
  indicatorId: string | null
  derivedIndicatorId: string | null
}

type ChartSpatialSelection = {
  productRunId: string
  geometryOutputIds: string[]
  mapBbox: {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
  } | null
}

type ChartUsageQuery = {
  indicatorId?: string | string[]
  productId?: string | string[]
  productRunId?: string
  datasetId?: string | string[]
  datasetRunId?: string
  geometriesId?: string | string[]
  geometriesRunId?: string
}

type ChartUsageCountFilter =
  | { type: 'indicator'; id: string }
  | { type: 'derived-indicator'; id: string }
  | { type: 'product'; id: string }
  | { type: 'product-run'; id: string }
  | { type: 'dataset'; id: string }
  | { type: 'dataset-run'; id: string }
  | { type: 'geometries'; id: string }
  | { type: 'geometries-run'; id: string }

const toUniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values))

const toIndicatorUsageKey = (usage: IndicatorUsageRow): string =>
  [
    usage.productRunId,
    usage.indicatorId ?? '',
    usage.derivedIndicatorId ?? '',
  ].join(':')

const getCountValue = (rows: { count: number | string | null }[]): number => {
  const count = rows[0]?.count

  if (typeof count === 'number') {
    return count
  }

  if (typeof count === 'string') {
    return Number(count)
  }

  return 0
}

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

const getChartSpatialSelection = (
  chart: ChartConfiguration,
): ChartSpatialSelection => ({
  productRunId: chart.productRunId,
  geometryOutputIds:
    'geometryOutputIds' in chart && Array.isArray(chart.geometryOutputIds)
      ? chart.geometryOutputIds
      : [],
  mapBbox: chart.appearance?.mapBbox ?? null,
})

const getReportChartSpatialSelections = (
  content: unknown,
): ChartSpatialSelection[] => {
  const parsedContent = parseNullableReportStoredContent(content)

  if (!parsedContent) {
    return []
  }

  return extractReportChartReferences(parsedContent).map(({ chart }) =>
    getChartSpatialSelection(chart),
  )
}

const getDashboardChartSpatialSelections = (
  content: DashboardContent,
): ChartSpatialSelection[] =>
  Object.values(content.charts).map((chart) => getChartSpatialSelection(chart))

const buildChartBoundsSql = (
  selection: ChartSpatialSelection,
): SQL<unknown> => {
  if (selection.mapBbox) {
    return sql`ST_MakeEnvelope(${selection.mapBbox.minLon}, ${selection.mapBbox.minLat}, ${selection.mapBbox.maxLon}, ${selection.mapBbox.maxLat}, 4326)`
  }

  if (selection.geometryOutputIds.length > 0) {
    return sql`
      (
        select ${buildExtentEnvelopeSql(geometryOutput.geometry)}
        from ${geometryOutput}
        inner join ${productRun}
          on ${productRun.geometriesRunId} = ${geometryOutput.geometriesRunId}
        where
          ${productRun.id} = ${selection.productRunId}
          and ${inArray(geometryOutput.id, selection.geometryOutputIds)}
      )
    `
  }

  return sql`
    (
      select ${buildExtentEnvelopeSql(geometryOutput.geometry)}
      from ${geometryOutput}
      inner join ${productRun}
        on ${productRun.geometriesRunId} = ${geometryOutput.geometriesRunId}
      where ${productRun.id} = ${selection.productRunId}
    )
  `
}

const buildUnionBoundsSql = (
  selections: ChartSpatialSelection[],
): SQL<unknown> | null => {
  if (selections.length === 0) {
    return null
  }

  const unionedSelections = sql.join(
    selections.map(
      (selection) => sql`select ${buildChartBoundsSql(selection)} as geom`,
    ),
    sql` union all `,
  )

  return sql`
    (
      select ST_Envelope(ST_Collect(chart_bounds.geom))
      from (${unionedSelections}) as chart_bounds
      where chart_bounds.geom is not null
    )
  `
}

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

const fetchReportUsageCount = async (
  filter: ChartUsageCountFilter,
): Promise<number> => {
  switch (filter.type) {
    case 'indicator': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .where(eq(reportIndicatorUsage.indicatorId, filter.id))
      return getCountValue(rows)
    }
    case 'derived-indicator': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .where(eq(reportIndicatorUsage.derivedIndicatorId, filter.id))
      return getCountValue(rows)
    }
    case 'product-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .where(eq(reportIndicatorUsage.productRunId, filter.id))
      return getCountValue(rows)
    }
    case 'product': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .innerJoin(
          productRun,
          eq(reportIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.productId, filter.id))
      return getCountValue(rows)
    }
    case 'dataset-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .innerJoin(
          productRun,
          eq(reportIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.datasetRunId, filter.id))
      return getCountValue(rows)
    }
    case 'dataset': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .innerJoin(
          productRun,
          eq(reportIndicatorUsage.productRunId, productRun.id),
        )
        .innerJoin(datasetRun, eq(productRun.datasetRunId, datasetRun.id))
        .where(eq(datasetRun.datasetId, filter.id))
      return getCountValue(rows)
    }
    case 'geometries-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .innerJoin(
          productRun,
          eq(reportIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.geometriesRunId, filter.id))
      return getCountValue(rows)
    }
    case 'geometries': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${reportIndicatorUsage.reportId})`,
        })
        .from(reportIndicatorUsage)
        .innerJoin(
          productRun,
          eq(reportIndicatorUsage.productRunId, productRun.id),
        )
        .innerJoin(
          geometriesRun,
          eq(productRun.geometriesRunId, geometriesRun.id),
        )
        .where(eq(geometriesRun.geometriesId, filter.id))
      return getCountValue(rows)
    }
  }
}

const fetchDashboardUsageCount = async (
  filter: ChartUsageCountFilter,
): Promise<number> => {
  switch (filter.type) {
    case 'indicator': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .where(eq(dashboardIndicatorUsage.indicatorId, filter.id))
      return getCountValue(rows)
    }
    case 'derived-indicator': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .where(eq(dashboardIndicatorUsage.derivedIndicatorId, filter.id))
      return getCountValue(rows)
    }
    case 'product-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .where(eq(dashboardIndicatorUsage.productRunId, filter.id))
      return getCountValue(rows)
    }
    case 'product': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .innerJoin(
          productRun,
          eq(dashboardIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.productId, filter.id))
      return getCountValue(rows)
    }
    case 'dataset-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .innerJoin(
          productRun,
          eq(dashboardIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.datasetRunId, filter.id))
      return getCountValue(rows)
    }
    case 'dataset': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .innerJoin(
          productRun,
          eq(dashboardIndicatorUsage.productRunId, productRun.id),
        )
        .innerJoin(datasetRun, eq(productRun.datasetRunId, datasetRun.id))
        .where(eq(datasetRun.datasetId, filter.id))
      return getCountValue(rows)
    }
    case 'geometries-run': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .innerJoin(
          productRun,
          eq(dashboardIndicatorUsage.productRunId, productRun.id),
        )
        .where(eq(productRun.geometriesRunId, filter.id))
      return getCountValue(rows)
    }
    case 'geometries': {
      const rows = await db
        .select({
          count: sql<number>`count(distinct ${dashboardIndicatorUsage.dashboardId})`,
        })
        .from(dashboardIndicatorUsage)
        .innerJoin(
          productRun,
          eq(dashboardIndicatorUsage.productRunId, productRun.id),
        )
        .innerJoin(
          geometriesRun,
          eq(productRun.geometriesRunId, geometriesRun.id),
        )
        .where(eq(geometriesRun.geometriesId, filter.id))
      return getCountValue(rows)
    }
  }
}

export const fetchChartUsageCounts = async (
  filter: ChartUsageCountFilter,
): Promise<{ reportCount: number; dashboardCount: number }> => {
  const [reportCount, dashboardCount] = await Promise.all([
    fetchReportUsageCount(filter),
    fetchDashboardUsageCount(filter),
  ])

  return {
    reportCount,
    dashboardCount,
  }
}

export const buildReportUsageFilters = (query: ChartUsageQuery): SQL[] => {
  const indicatorIds = normalizeFilterValues(query.indicatorId)
  const productIds = normalizeFilterValues(query.productId)
  const datasetIds = normalizeFilterValues(query.datasetId)
  const geometriesIds = normalizeFilterValues(query.geometriesId)

  const filters: (SQL | undefined)[] = [
    indicatorIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                or(
                  inArray(reportIndicatorUsage.indicatorId, indicatorIds),
                  inArray(
                    reportIndicatorUsage.derivedIndicatorId,
                    indicatorIds,
                  ),
                ),
              ),
            ),
        )
      : undefined,
    productIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .innerJoin(
              productRun,
              eq(reportIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                inArray(productRun.productId, productIds),
              ),
            ),
        )
      : undefined,
    query.productRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                eq(reportIndicatorUsage.productRunId, query.productRunId),
              ),
            ),
        )
      : undefined,
    datasetIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .innerJoin(
              productRun,
              eq(reportIndicatorUsage.productRunId, productRun.id),
            )
            .innerJoin(datasetRun, eq(productRun.datasetRunId, datasetRun.id))
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                inArray(datasetRun.datasetId, datasetIds),
              ),
            ),
        )
      : undefined,
    query.datasetRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .innerJoin(
              productRun,
              eq(reportIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                eq(productRun.datasetRunId, query.datasetRunId),
              ),
            ),
        )
      : undefined,
    geometriesIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .innerJoin(
              productRun,
              eq(reportIndicatorUsage.productRunId, productRun.id),
            )
            .innerJoin(
              geometriesRun,
              eq(productRun.geometriesRunId, geometriesRun.id),
            )
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                inArray(geometriesRun.geometriesId, geometriesIds),
              ),
            ),
        )
      : undefined,
    query.geometriesRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(reportIndicatorUsage)
            .innerJoin(
              productRun,
              eq(reportIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(reportIndicatorUsage.reportId, report.id),
                eq(productRun.geometriesRunId, query.geometriesRunId),
              ),
            ),
        )
      : undefined,
  ]

  return filters.filter((filter): filter is SQL => filter !== undefined)
}

export const buildDashboardUsageFilters = (query: ChartUsageQuery): SQL[] => {
  const indicatorIds = normalizeFilterValues(query.indicatorId)
  const productIds = normalizeFilterValues(query.productId)
  const datasetIds = normalizeFilterValues(query.datasetId)
  const geometriesIds = normalizeFilterValues(query.geometriesId)

  const filters: (SQL | undefined)[] = [
    indicatorIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                or(
                  inArray(dashboardIndicatorUsage.indicatorId, indicatorIds),
                  inArray(
                    dashboardIndicatorUsage.derivedIndicatorId,
                    indicatorIds,
                  ),
                ),
              ),
            ),
        )
      : undefined,
    productIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .innerJoin(
              productRun,
              eq(dashboardIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                inArray(productRun.productId, productIds),
              ),
            ),
        )
      : undefined,
    query.productRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                eq(dashboardIndicatorUsage.productRunId, query.productRunId),
              ),
            ),
        )
      : undefined,
    datasetIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .innerJoin(
              productRun,
              eq(dashboardIndicatorUsage.productRunId, productRun.id),
            )
            .innerJoin(datasetRun, eq(productRun.datasetRunId, datasetRun.id))
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                inArray(datasetRun.datasetId, datasetIds),
              ),
            ),
        )
      : undefined,
    query.datasetRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .innerJoin(
              productRun,
              eq(dashboardIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                eq(productRun.datasetRunId, query.datasetRunId),
              ),
            ),
        )
      : undefined,
    geometriesIds.length > 0
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .innerJoin(
              productRun,
              eq(dashboardIndicatorUsage.productRunId, productRun.id),
            )
            .innerJoin(
              geometriesRun,
              eq(productRun.geometriesRunId, geometriesRun.id),
            )
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                inArray(geometriesRun.geometriesId, geometriesIds),
              ),
            ),
        )
      : undefined,
    query.geometriesRunId
      ? exists(
          db
            .select({ _: sql`1` })
            .from(dashboardIndicatorUsage)
            .innerJoin(
              productRun,
              eq(dashboardIndicatorUsage.productRunId, productRun.id),
            )
            .where(
              and(
                eq(dashboardIndicatorUsage.dashboardId, dashboard.id),
                eq(productRun.geometriesRunId, query.geometriesRunId),
              ),
            ),
        )
      : undefined,
  ]

  return filters.filter((filter): filter is SQL => filter !== undefined)
}

export const syncReportChartUsages = async (
  tx: DbTransaction,
  reportId: string,
  content: unknown,
): Promise<void> => {
  const spatialSelections = getReportChartSpatialSelections(content)
  const indicatorUsages = await resolveIndicatorUsages(
    tx,
    getReportIndicatorSelections(content),
  )

  await replaceReportIndicatorUsages(tx, reportId, indicatorUsages)
  await tx
    .update(report)
    .set({
      bounds: buildUnionBoundsSql(spatialSelections),
    })
    .where(eq(report.id, reportId))
}

export const syncDashboardChartUsages = async (
  tx: DbTransaction,
  dashboardId: string,
  content: DashboardContent,
): Promise<void> => {
  const spatialSelections = getDashboardChartSpatialSelections(content)
  const indicatorUsages = await resolveIndicatorUsages(
    tx,
    getDashboardIndicatorSelections(content),
  )

  await replaceDashboardIndicatorUsages(tx, dashboardId, indicatorUsages)
  await tx
    .update(dashboard)
    .set({
      bounds: buildUnionBoundsSql(spatialSelections),
    })
    .where(eq(dashboard.id, dashboardId))
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
