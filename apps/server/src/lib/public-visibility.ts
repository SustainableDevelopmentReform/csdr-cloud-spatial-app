import { z } from '@hono/zod-openapi'
import { visibilitySchema } from '@repo/schemas/crud'
import { eq, inArray, or } from 'drizzle-orm'
import { db } from './db'
import { ServerError } from './error'
import type { AppVisibility } from './access-control'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type ExternallyVisibleVisibility = Exclude<AppVisibility, 'private'>

const visibilityImpactResourceTypeSchema = z.enum([
  'dataset',
  'geometries',
  'product',
  'indicator',
  'derivedIndicator',
  'report',
  'dashboard',
])

type VisibilityImpactResourceType = z.infer<
  typeof visibilityImpactResourceTypeSchema
>

const visibilityImpactCodeSchema = z.enum([
  'private_upstream_dependencies',
  'missing_main_run_output_summary',
  'externally_visible_dependents',
])

const visibilityImpactResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  resourceType: visibilityImpactResourceTypeSchema,
  visibility: visibilitySchema,
})

const visibilityImpactExternalCountSchema = z.object({
  resourceType: visibilityImpactResourceTypeSchema,
  count: z.number().int().min(1),
})

const visibilityImpactEntrySchema = z.object({
  code: visibilityImpactCodeSchema,
  message: z.string(),
  resources: z.array(visibilityImpactResourceSchema),
  externalCounts: z.array(visibilityImpactExternalCountSchema),
})

export const visibilityImpactSchema = z.object({
  canApply: z.boolean(),
  blockingIssues: z.array(visibilityImpactEntrySchema),
  warnings: z.array(visibilityImpactEntrySchema),
})

type VisibilityImpactEntry = z.infer<typeof visibilityImpactEntrySchema>
type VisibilityImpact = z.infer<typeof visibilityImpactSchema>

type InternalImpactResource = z.infer<typeof visibilityImpactResourceSchema> & {
  organizationId: string
}

const getPrivateDependencyMessage = (
  targetVisibility: ExternallyVisibleVisibility,
): string =>
  targetVisibility === 'global'
    ? 'This resource depends on private upstream data. Make every dependency public or global first.'
    : 'This resource depends on private upstream data. Make every dependency public first.'

const getProductSummaryMessage = (
  targetVisibility: ExternallyVisibleVisibility,
): string =>
  targetVisibility === 'global'
    ? 'This product needs a main run with an output summary before it can be public or global.'
    : 'This product needs a main run with an output summary before it can be public.'
const dependentWarningMessage =
  'Other externally visible resources depend on this. Changing it to private may break them until you update their visibility or restore this dependency.'

const isExternallyVisible = (visibility: AppVisibility): boolean =>
  visibility !== 'private'

const toResourceKey = (
  resource: Pick<InternalImpactResource, 'resourceType' | 'id'>,
): string => `${resource.resourceType}:${resource.id}`

const appendVisibleResource = (
  resourceMap: Map<string, InternalImpactResource>,
  resource: InternalImpactResource | null,
): void => {
  if (!resource || !isExternallyVisible(resource.visibility)) {
    return
  }

  resourceMap.set(toResourceKey(resource), resource)
}

const appendPrivateDependency = (
  resourceMap: Map<string, InternalImpactResource>,
  resource: InternalImpactResource | null,
): void => {
  if (!resource || resource.visibility !== 'private') {
    return
  }

  resourceMap.set(toResourceKey(resource), resource)
}

const toPublicResource = (
  resource: InternalImpactResource,
): z.infer<typeof visibilityImpactResourceSchema> => ({
  id: resource.id,
  name: resource.name,
  resourceType: resource.resourceType,
  visibility: resource.visibility,
})

const partitionResources = (
  resources: InternalImpactResource[],
  sameOrganizationId: string,
): {
  resources: z.infer<typeof visibilityImpactResourceSchema>[]
  externalCounts: z.infer<typeof visibilityImpactExternalCountSchema>[]
} => {
  const sameOrganizationResources = resources
    .filter((resource) => resource.organizationId === sameOrganizationId)
    .map(toPublicResource)
  const externalCountMap = new Map<VisibilityImpactResourceType, number>()

  for (const resource of resources) {
    if (resource.organizationId === sameOrganizationId) {
      continue
    }

    const previousCount = externalCountMap.get(resource.resourceType) ?? 0
    externalCountMap.set(resource.resourceType, previousCount + 1)
  }

  const externalCounts = Array.from(externalCountMap.entries()).map(
    ([resourceType, count]) => ({
      resourceType,
      count,
    }),
  )

  return {
    resources: sameOrganizationResources,
    externalCounts,
  }
}

const createImpactEntry = (input: {
  code: z.infer<typeof visibilityImpactCodeSchema>
  message: string
  resources: InternalImpactResource[]
  sameOrganizationId: string
}): VisibilityImpactEntry => {
  const partitioned = partitionResources(
    input.resources,
    input.sameOrganizationId,
  )

  return {
    code: input.code,
    message: input.message,
    resources: partitioned.resources,
    externalCounts: partitioned.externalCounts,
  }
}

const buildImpact = (input: {
  blockingIssues?: VisibilityImpactEntry[]
  warnings?: VisibilityImpactEntry[]
}): VisibilityImpact => {
  const blockingIssues = input.blockingIssues ?? []
  const warnings = input.warnings ?? []

  return {
    canApply: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  }
}

const throwVisibilityDependencyError = (input: {
  resourceType: 'dashboard' | 'report' | 'derivedIndicator' | 'product'
  targetVisibility: ExternallyVisibleVisibility
  impact: VisibilityImpact
}): never => {
  const productSummaryIssue = input.impact.blockingIssues.find(
    (issue) => issue.code === 'missing_main_run_output_summary',
  )

  if (productSummaryIssue) {
    throw new ServerError({
      statusCode: 400,
      message: `Cannot make ${input.resourceType} ${input.targetVisibility}`,
      description: productSummaryIssue.message,
    })
  }

  const dependencyIssue = input.impact.blockingIssues.find(
    (issue) => issue.code === 'private_upstream_dependencies',
  )

  throw new ServerError({
    statusCode: 400,
    message: `Cannot make ${input.resourceType} ${input.targetVisibility}`,
    description: getPrivateDependencyMessage(input.targetVisibility),
    data: {
      dependencies: dependencyIssue?.resources ?? [],
    },
  })
}

const getProductRunsForProductIds = async (
  tx: DbTransaction,
  productIds: string[],
): Promise<string[]> => {
  if (productIds.length === 0) {
    return []
  }

  const runs = await tx.query.productRun.findMany({
    where: (table, { inArray: inArrayFn }) =>
      inArrayFn(table.productId, productIds),
    columns: {
      id: true,
    },
  })

  return runs.map((run) => run.id)
}

const getVisibleProductsForRunIds = async (
  tx: DbTransaction,
  runIds: string[],
): Promise<InternalImpactResource[]> => {
  if (runIds.length === 0) {
    return []
  }

  const runs = await tx.query.productRun.findMany({
    where: (table, { inArray: inArrayFn }) => inArrayFn(table.id, runIds),
    columns: {
      id: true,
    },
    with: {
      product: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const run of runs) {
    const product = run.product
    appendVisibleResource(
      resourceMap,
      product
        ? {
            id: product.id,
            name: product.name,
            resourceType: 'product',
            visibility: product.visibility,
            organizationId: product.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const getVisibleReportsForRunIds = async (
  tx: DbTransaction,
  runIds: string[],
): Promise<InternalImpactResource[]> => {
  if (runIds.length === 0) {
    return []
  }

  const usages = await tx.query.reportIndicatorUsage.findMany({
    where: (table, { inArray: inArrayFn }) =>
      inArrayFn(table.productRunId, runIds),
    with: {
      report: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const usage of usages) {
    const report = usage.report
    appendVisibleResource(
      resourceMap,
      report
        ? {
            id: report.id,
            name: report.name,
            resourceType: 'report',
            visibility: report.visibility,
            organizationId: report.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const getVisibleDashboardsForRunIds = async (
  tx: DbTransaction,
  runIds: string[],
): Promise<InternalImpactResource[]> => {
  if (runIds.length === 0) {
    return []
  }

  const usages = await tx.query.dashboardIndicatorUsage.findMany({
    where: (table, { inArray: inArrayFn }) =>
      inArrayFn(table.productRunId, runIds),
    with: {
      dashboard: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const usage of usages) {
    const dashboard = usage.dashboard
    appendVisibleResource(
      resourceMap,
      dashboard
        ? {
            id: dashboard.id,
            name: dashboard.name,
            resourceType: 'dashboard',
            visibility: dashboard.visibility,
            organizationId: dashboard.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const getVisibleReportsByIndicatorIds = async (
  tx: DbTransaction,
  indicatorIds: string[],
  derivedIndicatorIds: string[],
): Promise<InternalImpactResource[]> => {
  if (indicatorIds.length === 0 && derivedIndicatorIds.length === 0) {
    return []
  }

  const usages = await tx.query.reportIndicatorUsage.findMany({
    where: (table) => {
      const measuredPredicate =
        indicatorIds.length > 0
          ? inArray(table.indicatorId, indicatorIds)
          : undefined
      const derivedPredicate =
        derivedIndicatorIds.length > 0
          ? inArray(table.derivedIndicatorId, derivedIndicatorIds)
          : undefined

      const predicate = or(measuredPredicate, derivedPredicate)

      if (!predicate) {
        throw new Error('Missing indicator usage predicate')
      }

      return predicate
    },
    with: {
      report: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const usage of usages) {
    const report = usage.report
    appendVisibleResource(
      resourceMap,
      report
        ? {
            id: report.id,
            name: report.name,
            resourceType: 'report',
            visibility: report.visibility,
            organizationId: report.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const getVisibleDashboardsByIndicatorIds = async (
  tx: DbTransaction,
  indicatorIds: string[],
  derivedIndicatorIds: string[],
): Promise<InternalImpactResource[]> => {
  if (indicatorIds.length === 0 && derivedIndicatorIds.length === 0) {
    return []
  }

  const usages = await tx.query.dashboardIndicatorUsage.findMany({
    where: (table) => {
      const measuredPredicate =
        indicatorIds.length > 0
          ? inArray(table.indicatorId, indicatorIds)
          : undefined
      const derivedPredicate =
        derivedIndicatorIds.length > 0
          ? inArray(table.derivedIndicatorId, derivedIndicatorIds)
          : undefined

      const predicate = or(measuredPredicate, derivedPredicate)

      if (!predicate) {
        throw new Error('Missing indicator usage predicate')
      }

      return predicate
    },
    with: {
      dashboard: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const usage of usages) {
    const dashboard = usage.dashboard
    appendVisibleResource(
      resourceMap,
      dashboard
        ? {
            id: dashboard.id,
            name: dashboard.name,
            resourceType: 'dashboard',
            visibility: dashboard.visibility,
            organizationId: dashboard.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const getVisibleProductsForSummaryIndicators = async (
  tx: DbTransaction,
  indicatorIds: string[],
  derivedIndicatorIds: string[],
): Promise<InternalImpactResource[]> => {
  if (indicatorIds.length === 0 && derivedIndicatorIds.length === 0) {
    return []
  }

  const summaryIndicators =
    await tx.query.productOutputSummaryIndicator.findMany({
      where: (table) => {
        const measuredPredicate =
          indicatorIds.length > 0
            ? inArray(table.indicatorId, indicatorIds)
            : undefined
        const derivedPredicate =
          derivedIndicatorIds.length > 0
            ? inArray(table.derivedIndicatorId, derivedIndicatorIds)
            : undefined

        const predicate = or(measuredPredicate, derivedPredicate)

        if (!predicate) {
          throw new Error('Missing summary indicator predicate')
        }

        return predicate
      },
      columns: {
        productRunId: true,
      },
    })

  const runIds = summaryIndicators.map(
    (summaryIndicator) => summaryIndicator.productRunId,
  )

  return getVisibleProductsForRunIds(tx, runIds)
}

const getVisibleDerivedIndicatorsForMeasuredIndicator = async (
  tx: DbTransaction,
  indicatorId: string,
): Promise<InternalImpactResource[]> => {
  const dependencies = await tx.query.derivedIndicatorToIndicator.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.indicatorId, indicatorId),
    with: {
      derivedIndicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  const resourceMap = new Map<string, InternalImpactResource>()
  for (const dependency of dependencies) {
    const derivedIndicator = dependency.derivedIndicator
    appendVisibleResource(
      resourceMap,
      derivedIndicator
        ? {
            id: derivedIndicator.id,
            name: derivedIndicator.name,
            resourceType: 'derivedIndicator',
            visibility: derivedIndicator.visibility,
            organizationId: derivedIndicator.organizationId,
          }
        : null,
    )
  }

  return Array.from(resourceMap.values())
}

const collectUsageDependencyIssues = (
  usages: {
    productRun: {
      product: {
        id: string
        name: string
        visibility: AppVisibility
        organizationId: string
        dataset: {
          id: string
          name: string
          visibility: AppVisibility
          organizationId: string
        } | null
        geometries: {
          id: string
          name: string
          visibility: AppVisibility
          organizationId: string
        } | null
      } | null
    } | null
    indicator: {
      id: string
      name: string
      visibility: AppVisibility
      organizationId: string
    } | null
    derivedIndicator: {
      id: string
      name: string
      visibility: AppVisibility
      organizationId: string
      indicators: {
        indicator: {
          id: string
          name: string
          visibility: AppVisibility
          organizationId: string
        } | null
      }[]
    } | null
  }[],
): InternalImpactResource[] => {
  const issues = new Map<string, InternalImpactResource>()

  for (const usage of usages) {
    const product = usage.productRun?.product ?? null
    const indicator = usage.indicator
    const derivedIndicator = usage.derivedIndicator

    appendPrivateDependency(
      issues,
      product
        ? {
            id: product.id,
            name: product.name,
            resourceType: 'product',
            visibility: product.visibility,
            organizationId: product.organizationId,
          }
        : null,
    )
    appendPrivateDependency(
      issues,
      product?.dataset
        ? {
            id: product.dataset.id,
            name: product.dataset.name,
            resourceType: 'dataset',
            visibility: product.dataset.visibility,
            organizationId: product.dataset.organizationId,
          }
        : null,
    )
    appendPrivateDependency(
      issues,
      product?.geometries
        ? {
            id: product.geometries.id,
            name: product.geometries.name,
            resourceType: 'geometries',
            visibility: product.geometries.visibility,
            organizationId: product.geometries.organizationId,
          }
        : null,
    )

    appendPrivateDependency(
      issues,
      indicator
        ? {
            id: indicator.id,
            name: indicator.name,
            resourceType: 'indicator',
            visibility: indicator.visibility,
            organizationId: indicator.organizationId,
          }
        : null,
    )

    appendPrivateDependency(
      issues,
      derivedIndicator
        ? {
            id: derivedIndicator.id,
            name: derivedIndicator.name,
            resourceType: 'derivedIndicator',
            visibility: derivedIndicator.visibility,
            organizationId: derivedIndicator.organizationId,
          }
        : null,
    )

    for (const dependency of derivedIndicator?.indicators ?? []) {
      const measuredIndicator = dependency.indicator

      appendPrivateDependency(
        issues,
        measuredIndicator
          ? {
              id: measuredIndicator.id,
              name: measuredIndicator.name,
              resourceType: 'indicator',
              visibility: measuredIndicator.visibility,
              organizationId: measuredIndicator.organizationId,
            }
          : null,
      )
    }
  }

  return Array.from(issues.values())
}

export const getDerivedIndicatorVisibilityImpact = async (
  tx: DbTransaction,
  derivedIndicatorId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility === 'private') {
    const downstreamResources = new Map<string, InternalImpactResource>()
    const products = await getVisibleProductsForSummaryIndicators(
      tx,
      [],
      [derivedIndicatorId],
    )
    const productIds = products.map((product) => product.id)
    const runIds = await getProductRunsForProductIds(tx, productIds)
    const reports = await getVisibleReportsByIndicatorIds(
      tx,
      [],
      [derivedIndicatorId],
    )
    const dashboards = await getVisibleDashboardsByIndicatorIds(
      tx,
      [],
      [derivedIndicatorId],
    )

    for (const resource of [...products, ...reports, ...dashboards]) {
      appendVisibleResource(downstreamResources, resource)
    }

    if (downstreamResources.size === 0) {
      return buildImpact({})
    }

    return buildImpact({
      warnings: [
        createImpactEntry({
          code: 'externally_visible_dependents',
          message: dependentWarningMessage,
          resources: Array.from(downstreamResources.values()),
          sameOrganizationId,
        }),
      ],
    })
  }

  const record = await tx.query.derivedIndicator.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, derivedIndicatorId),
    columns: {
      id: true,
      name: true,
      visibility: true,
      organizationId: true,
    },
    with: {
      indicators: {
        with: {
          indicator: {
            columns: {
              id: true,
              name: true,
              visibility: true,
              organizationId: true,
            },
          },
        },
      },
    },
  })

  if (!record) {
    return buildImpact({})
  }

  const issues = new Map<string, InternalImpactResource>()
  for (const dependency of record.indicators) {
    const measuredIndicator = dependency.indicator
    appendPrivateDependency(
      issues,
      measuredIndicator
        ? {
            id: measuredIndicator.id,
            name: measuredIndicator.name,
            resourceType: 'indicator',
            visibility: measuredIndicator.visibility,
            organizationId: measuredIndicator.organizationId,
          }
        : null,
    )
  }

  if (issues.size === 0) {
    return buildImpact({})
  }

  return buildImpact({
    blockingIssues: [
      createImpactEntry({
        code: 'private_upstream_dependencies',
        message: getPrivateDependencyMessage(targetVisibility),
        resources: Array.from(issues.values()),
        sameOrganizationId,
      }),
    ],
  })
}

export const assertDerivedIndicatorDependenciesExternallyVisible = async (
  tx: DbTransaction,
  derivedIndicatorId: string,
  targetVisibility: ExternallyVisibleVisibility,
  sameOrganizationId: string,
): Promise<void> => {
  const impact = await getDerivedIndicatorVisibilityImpact(
    tx,
    derivedIndicatorId,
    targetVisibility,
    sameOrganizationId,
  )

  if (!impact.canApply) {
    throwVisibilityDependencyError({
      resourceType: 'derivedIndicator',
      targetVisibility,
      impact,
    })
  }
}

export const getReportVisibilityImpact = async (
  tx: DbTransaction,
  reportId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility === 'private') {
    return buildImpact({})
  }

  const usages = await tx.query.reportIndicatorUsage.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.reportId, reportId),
    with: {
      productRun: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              visibility: true,
              organizationId: true,
            },
            with: {
              dataset: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
              geometries: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
            },
          },
        },
      },
      indicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
      derivedIndicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
        with: {
          indicators: {
            with: {
              indicator: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const dependencyIssues = collectUsageDependencyIssues(usages)

  if (dependencyIssues.length === 0) {
    return buildImpact({})
  }

  return buildImpact({
    blockingIssues: [
      createImpactEntry({
        code: 'private_upstream_dependencies',
        message: getPrivateDependencyMessage(targetVisibility),
        resources: dependencyIssues,
        sameOrganizationId,
      }),
    ],
  })
}

export const assertReportDependenciesExternallyVisible = async (
  tx: DbTransaction,
  reportId: string,
  targetVisibility: ExternallyVisibleVisibility,
  sameOrganizationId: string,
): Promise<void> => {
  const impact = await getReportVisibilityImpact(
    tx,
    reportId,
    targetVisibility,
    sameOrganizationId,
  )

  if (!impact.canApply) {
    throwVisibilityDependencyError({
      resourceType: 'report',
      targetVisibility,
      impact,
    })
  }
}

export const getDashboardVisibilityImpact = async (
  tx: DbTransaction,
  dashboardId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility === 'private') {
    return buildImpact({})
  }

  const usages = await tx.query.dashboardIndicatorUsage.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.dashboardId, dashboardId),
    with: {
      productRun: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              visibility: true,
              organizationId: true,
            },
            with: {
              dataset: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
              geometries: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
            },
          },
        },
      },
      indicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
      derivedIndicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
        with: {
          indicators: {
            with: {
              indicator: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                  organizationId: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const dependencyIssues = collectUsageDependencyIssues(usages)

  if (dependencyIssues.length === 0) {
    return buildImpact({})
  }

  return buildImpact({
    blockingIssues: [
      createImpactEntry({
        code: 'private_upstream_dependencies',
        message: getPrivateDependencyMessage(targetVisibility),
        resources: dependencyIssues,
        sameOrganizationId,
      }),
    ],
  })
}

export const assertDashboardDependenciesExternallyVisible = async (
  tx: DbTransaction,
  dashboardId: string,
  targetVisibility: ExternallyVisibleVisibility,
  sameOrganizationId: string,
): Promise<void> => {
  const impact = await getDashboardVisibilityImpact(
    tx,
    dashboardId,
    targetVisibility,
    sameOrganizationId,
  )

  if (!impact.canApply) {
    throwVisibilityDependencyError({
      resourceType: 'dashboard',
      targetVisibility,
      impact,
    })
  }
}

export const getProductVisibilityImpact = async (
  tx: DbTransaction,
  productId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility === 'private') {
    const runIds = await getProductRunsForProductIds(tx, [productId])
    const downstreamResources = new Map<string, InternalImpactResource>()
    const reports = await getVisibleReportsForRunIds(tx, runIds)
    const dashboards = await getVisibleDashboardsForRunIds(tx, runIds)

    for (const resource of [...reports, ...dashboards]) {
      appendVisibleResource(downstreamResources, resource)
    }

    if (downstreamResources.size === 0) {
      return buildImpact({})
    }

    return buildImpact({
      warnings: [
        createImpactEntry({
          code: 'externally_visible_dependents',
          message: dependentWarningMessage,
          resources: Array.from(downstreamResources.values()),
          sameOrganizationId,
        }),
      ],
    })
  }

  const record = await tx.query.product.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, productId),
    columns: {
      id: true,
      name: true,
      visibility: true,
      organizationId: true,
      mainRunId: true,
    },
    with: {
      dataset: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
      geometries: {
        columns: {
          id: true,
          name: true,
          visibility: true,
          organizationId: true,
        },
      },
    },
  })

  if (!record) {
    return buildImpact({})
  }

  if (!record.mainRunId) {
    return buildImpact({
      blockingIssues: [
        createImpactEntry({
          code: 'missing_main_run_output_summary',
          message: getProductSummaryMessage(targetVisibility),
          resources: [],
          sameOrganizationId,
        }),
      ],
    })
  }

  const mainRunId = record.mainRunId

  const outputSummary = await tx.query.productOutputSummary.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.productRunId, mainRunId),
    columns: {
      productRunId: true,
    },
  })

  if (!outputSummary) {
    return buildImpact({
      blockingIssues: [
        createImpactEntry({
          code: 'missing_main_run_output_summary',
          message: getProductSummaryMessage(targetVisibility),
          resources: [],
          sameOrganizationId,
        }),
      ],
    })
  }

  const outputSummaryIndicators =
    await tx.query.productOutputSummaryIndicator.findMany({
      where: (table, { eq: eqFn }) => eqFn(table.productRunId, mainRunId),
      columns: {
        indicatorId: true,
        derivedIndicatorId: true,
      },
    })

  const measuredIndicatorIds = Array.from(
    new Set(
      outputSummaryIndicators
        .map((summaryIndicator) => summaryIndicator.indicatorId)
        .filter((indicatorId) => indicatorId !== null),
    ),
  )
  const derivedIndicatorIds = Array.from(
    new Set(
      outputSummaryIndicators
        .map((summaryIndicator) => summaryIndicator.derivedIndicatorId)
        .filter((indicatorId) => indicatorId !== null),
    ),
  )

  const measuredIndicators =
    measuredIndicatorIds.length > 0
      ? await tx.query.indicator.findMany({
          where: (table, { inArray: inArrayFn }) =>
            inArrayFn(table.id, measuredIndicatorIds),
          columns: {
            id: true,
            name: true,
            visibility: true,
            organizationId: true,
          },
        })
      : []

  const derivedIndicators =
    derivedIndicatorIds.length > 0
      ? await tx.query.derivedIndicator.findMany({
          where: (table, { inArray: inArrayFn }) =>
            inArrayFn(table.id, derivedIndicatorIds),
          columns: {
            id: true,
            name: true,
            visibility: true,
            organizationId: true,
          },
        })
      : []

  const derivedIndicatorDependencies =
    derivedIndicatorIds.length > 0
      ? await tx.query.derivedIndicatorToIndicator.findMany({
          where: (table, { inArray: inArrayFn }) =>
            inArrayFn(table.derivedIndicatorId, derivedIndicatorIds),
          with: {
            indicator: {
              columns: {
                id: true,
                name: true,
                visibility: true,
                organizationId: true,
              },
            },
          },
        })
      : []

  const issues = new Map<string, InternalImpactResource>()

  appendPrivateDependency(
    issues,
    record.dataset
      ? {
          id: record.dataset.id,
          name: record.dataset.name,
          resourceType: 'dataset',
          visibility: record.dataset.visibility,
          organizationId: record.dataset.organizationId,
        }
      : null,
  )
  appendPrivateDependency(
    issues,
    record.geometries
      ? {
          id: record.geometries.id,
          name: record.geometries.name,
          resourceType: 'geometries',
          visibility: record.geometries.visibility,
          organizationId: record.geometries.organizationId,
        }
      : null,
  )

  for (const measuredIndicator of measuredIndicators) {
    appendPrivateDependency(issues, {
      id: measuredIndicator.id,
      name: measuredIndicator.name,
      resourceType: 'indicator',
      visibility: measuredIndicator.visibility,
      organizationId: measuredIndicator.organizationId,
    })
  }

  for (const derivedIndicator of derivedIndicators) {
    appendPrivateDependency(issues, {
      id: derivedIndicator.id,
      name: derivedIndicator.name,
      resourceType: 'derivedIndicator',
      visibility: derivedIndicator.visibility,
      organizationId: derivedIndicator.organizationId,
    })
  }

  for (const dependency of derivedIndicatorDependencies) {
    appendPrivateDependency(
      issues,
      dependency.indicator
        ? {
            id: dependency.indicator.id,
            name: dependency.indicator.name,
            resourceType: 'indicator',
            visibility: dependency.indicator.visibility,
            organizationId: dependency.indicator.organizationId,
          }
        : null,
    )
  }

  if (issues.size === 0) {
    return buildImpact({})
  }

  return buildImpact({
    blockingIssues: [
      createImpactEntry({
        code: 'private_upstream_dependencies',
        message: getPrivateDependencyMessage(targetVisibility),
        resources: Array.from(issues.values()),
        sameOrganizationId,
      }),
    ],
  })
}

export const assertProductDependenciesExternallyVisible = async (
  tx: DbTransaction,
  productId: string,
  targetVisibility: ExternallyVisibleVisibility,
  sameOrganizationId: string,
): Promise<void> => {
  const impact = await getProductVisibilityImpact(
    tx,
    productId,
    targetVisibility,
    sameOrganizationId,
  )

  if (!impact.canApply) {
    throwVisibilityDependencyError({
      resourceType: 'product',
      targetVisibility,
      impact,
    })
  }
}

export const getDatasetVisibilityImpact = async (
  tx: DbTransaction,
  datasetId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility !== 'private') {
    return buildImpact({})
  }

  const products = await tx.query.product.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.datasetId, datasetId),
    columns: {
      id: true,
      name: true,
      visibility: true,
      organizationId: true,
    },
  })

  const downstreamResources = new Map<string, InternalImpactResource>()
  const visibleProducts = products.filter((product) =>
    isExternallyVisible(product.visibility),
  )

  for (const product of visibleProducts) {
    appendVisibleResource(downstreamResources, {
      id: product.id,
      name: product.name,
      resourceType: 'product',
      visibility: product.visibility,
      organizationId: product.organizationId,
    })
  }

  const runIds = await getProductRunsForProductIds(
    tx,
    visibleProducts.map((product) => product.id),
  )
  const reports = await getVisibleReportsForRunIds(tx, runIds)
  const dashboards = await getVisibleDashboardsForRunIds(tx, runIds)

  for (const resource of [...reports, ...dashboards]) {
    appendVisibleResource(downstreamResources, resource)
  }

  if (downstreamResources.size === 0) {
    return buildImpact({})
  }

  return buildImpact({
    warnings: [
      createImpactEntry({
        code: 'externally_visible_dependents',
        message: dependentWarningMessage,
        resources: Array.from(downstreamResources.values()),
        sameOrganizationId,
      }),
    ],
  })
}

export const getGeometriesVisibilityImpact = async (
  tx: DbTransaction,
  geometriesId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility !== 'private') {
    return buildImpact({})
  }

  const products = await tx.query.product.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.geometriesId, geometriesId),
    columns: {
      id: true,
      name: true,
      visibility: true,
      organizationId: true,
    },
  })

  const downstreamResources = new Map<string, InternalImpactResource>()
  const visibleProducts = products.filter((product) =>
    isExternallyVisible(product.visibility),
  )

  for (const product of visibleProducts) {
    appendVisibleResource(downstreamResources, {
      id: product.id,
      name: product.name,
      resourceType: 'product',
      visibility: product.visibility,
      organizationId: product.organizationId,
    })
  }

  const runIds = await getProductRunsForProductIds(
    tx,
    visibleProducts.map((product) => product.id),
  )
  const reports = await getVisibleReportsForRunIds(tx, runIds)
  const dashboards = await getVisibleDashboardsForRunIds(tx, runIds)

  for (const resource of [...reports, ...dashboards]) {
    appendVisibleResource(downstreamResources, resource)
  }

  if (downstreamResources.size === 0) {
    return buildImpact({})
  }

  return buildImpact({
    warnings: [
      createImpactEntry({
        code: 'externally_visible_dependents',
        message: dependentWarningMessage,
        resources: Array.from(downstreamResources.values()),
        sameOrganizationId,
      }),
    ],
  })
}

export const getMeasuredIndicatorVisibilityImpact = async (
  tx: DbTransaction,
  indicatorId: string,
  targetVisibility: AppVisibility,
  sameOrganizationId: string,
): Promise<VisibilityImpact> => {
  if (targetVisibility !== 'private') {
    return buildImpact({})
  }

  const downstreamResources = new Map<string, InternalImpactResource>()
  const derivedIndicators =
    await getVisibleDerivedIndicatorsForMeasuredIndicator(tx, indicatorId)
  const derivedIndicatorIds = derivedIndicators.map(
    (derivedIndicator) => derivedIndicator.id,
  )
  const products = await getVisibleProductsForSummaryIndicators(
    tx,
    [indicatorId],
    derivedIndicatorIds,
  )
  const productIds = products.map((product) => product.id)
  const runIds = await getProductRunsForProductIds(tx, productIds)
  const reports = await getVisibleReportsByIndicatorIds(
    tx,
    [indicatorId],
    [...derivedIndicatorIds],
  )
  const dashboards = await getVisibleDashboardsByIndicatorIds(
    tx,
    [indicatorId],
    [...derivedIndicatorIds],
  )
  const reportsFromProducts = await getVisibleReportsForRunIds(tx, runIds)
  const dashboardsFromProducts = await getVisibleDashboardsForRunIds(tx, runIds)

  for (const resource of [
    ...derivedIndicators,
    ...products,
    ...reports,
    ...dashboards,
    ...reportsFromProducts,
    ...dashboardsFromProducts,
  ]) {
    appendVisibleResource(downstreamResources, resource)
  }

  if (downstreamResources.size === 0) {
    return buildImpact({})
  }

  return buildImpact({
    warnings: [
      createImpactEntry({
        code: 'externally_visible_dependents',
        message: dependentWarningMessage,
        resources: Array.from(downstreamResources.values()),
        sameOrganizationId,
      }),
    ],
  })
}
