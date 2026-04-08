import { and, inArray } from 'drizzle-orm'
import { db } from './db'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbLike = DbTransaction | typeof db

type ReportSource = {
  resourceType: 'product' | 'dataset' | 'geometries'
  id: string
  name: string
  description: string | null
  createdAt: string
}

type SourceRecord = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

type ProductSourceRecord = SourceRecord & {
  dataset: SourceRecord | null
  geometries: SourceRecord | null
}

const sourceOrder: Record<ReportSource['resourceType'], number> = {
  product: 0,
  dataset: 1,
  geometries: 2,
}

const buildSourceKey = (
  resourceType: ReportSource['resourceType'],
  id: string,
) => `${resourceType}:${id}`

const appendSource = (
  sources: Map<string, ReportSource>,
  resourceType: ReportSource['resourceType'],
  record: SourceRecord | null | undefined,
) => {
  if (!record) {
    return
  }

  sources.set(buildSourceKey(resourceType, record.id), {
    resourceType,
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
  })
}

const productSourceQuery = {
  columns: {
    id: true,
  },
  with: {
    product: {
      columns: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
      with: {
        dataset: {
          columns: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
        geometries: {
          columns: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
      },
    },
  },
} as const

const appendProduct = (
  products: Map<string, ProductSourceRecord>,
  record: ProductSourceRecord | null | undefined,
) => {
  if (!record) {
    return
  }

  products.set(record.id, record)
}

export const deriveReportSources = async (
  dbOrTx: DbLike,
  reportId: string,
): Promise<ReportSource[]> => {
  const usages = await dbOrTx.query.reportIndicatorUsage.findMany({
    where: (table, { eq }) => eq(table.reportId, reportId),
    columns: {
      productRunId: true,
      derivedIndicatorId: true,
    },
    with: {
      productRun: {
        columns: {
          id: true,
        },
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
            },
            with: {
              dataset: {
                columns: {
                  id: true,
                  name: true,
                  description: true,
                  createdAt: true,
                },
              },
              geometries: {
                columns: {
                  id: true,
                  name: true,
                  description: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const products = new Map<string, ProductSourceRecord>()

  const derivedUsagePairs = new Set<string>()
  const derivedIndicatorIds = new Set<string>()
  const productRunIds = new Set<string>()

  for (const usage of usages) {
    const sourceProduct = usage.productRun?.product

    appendProduct(products, sourceProduct)

    if (usage.derivedIndicatorId) {
      derivedUsagePairs.add(`${usage.productRunId}:${usage.derivedIndicatorId}`)
      derivedIndicatorIds.add(usage.derivedIndicatorId)
      productRunIds.add(usage.productRunId)
    }
  }

  if (derivedUsagePairs.size > 0) {
    const assignedDerivedIndicators =
      await dbOrTx.query.productRunAssignedDerivedIndicator.findMany({
        where: (table) =>
          and(
            inArray(table.productRunId, Array.from(productRunIds)),
            inArray(table.derivedIndicatorId, Array.from(derivedIndicatorIds)),
          ),
        columns: {
          productRunId: true,
          derivedIndicatorId: true,
        },
        with: {
          dependencies: {
            columns: {
              sourceProductRunId: true,
            },
          },
        },
      })

    const dependencySourceProductRunIds = new Set<string>()

    for (const assignedDerivedIndicator of assignedDerivedIndicators) {
      const usagePairKey = `${assignedDerivedIndicator.productRunId}:${assignedDerivedIndicator.derivedIndicatorId}`

      if (!derivedUsagePairs.has(usagePairKey)) {
        continue
      }

      for (const dependency of assignedDerivedIndicator.dependencies) {
        dependencySourceProductRunIds.add(dependency.sourceProductRunId)
      }
    }

    if (dependencySourceProductRunIds.size > 0) {
      const dependencyProductRuns = await dbOrTx.query.productRun.findMany({
        where: (table, { inArray: inArrayFn }) =>
          inArrayFn(table.id, Array.from(dependencySourceProductRunIds)),
        ...productSourceQuery,
      })

      for (const dependencyProductRun of dependencyProductRuns) {
        appendProduct(products, dependencyProductRun.product)
      }
    }
  }

  const sources = new Map<string, ReportSource>()

  for (const product of products.values()) {
    appendSource(sources, 'product', product)
    appendSource(sources, 'dataset', product.dataset)
    appendSource(sources, 'geometries', product.geometries)
  }

  return Array.from(sources.values()).sort((left, right) => {
    const leftOrder = sourceOrder[left.resourceType] ?? 0
    const rightOrder = sourceOrder[right.resourceType] ?? 0
    const orderDifference = leftOrder - rightOrder

    if (orderDifference !== 0) {
      return orderDifference
    }

    const nameDifference = left.name.localeCompare(right.name)

    if (nameDifference !== 0) {
      return nameDifference
    }

    return left.id.localeCompare(right.id)
  })
}
