import { eq } from 'drizzle-orm'
import { ServerError } from './error'
import { db } from './db'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type DependencyIssue = {
  id: string
  name: string
  resourceType:
    | 'dataset'
    | 'geometries'
    | 'product'
    | 'indicator'
    | 'derivedIndicator'
    | 'indicatorCategory'
  visibility: 'private' | 'public'
}

const toIssueKey = (issue: DependencyIssue) =>
  `${issue.resourceType}:${issue.id}:${issue.visibility}`

const appendIssue = (
  issueMap: Map<string, DependencyIssue>,
  issue: DependencyIssue | null,
) => {
  if (!issue || issue.visibility === 'public') {
    return
  }

  issueMap.set(toIssueKey(issue), issue)
}

const throwDependencyError = (
  resourceType: 'dashboard' | 'report' | 'derivedIndicator',
  issues: DependencyIssue[],
) => {
  throw new ServerError({
    statusCode: 400,
    message: `Cannot make ${resourceType} public`,
    description:
      'This resource depends on private upstream data. Make every dependency public first.',
    data: {
      dependencies: issues.map((issue) => ({
        id: issue.id,
        name: issue.name,
        resourceType: issue.resourceType,
        visibility: issue.visibility,
      })),
    },
  })
}

const collectUsageDependencyIssues = (
  usages: {
    productRun: {
      product: {
        id: string
        name: string
        visibility: 'private' | 'public'
        dataset: {
          id: string
          name: string
          visibility: 'private' | 'public'
        } | null
        geometries: {
          id: string
          name: string
          visibility: 'private' | 'public'
        } | null
      } | null
    } | null
    indicator: {
      id: string
      name: string
      visibility: 'private' | 'public'
      category: {
        id: string
        name: string
        visibility: 'private' | 'public'
      } | null
    } | null
    derivedIndicator: {
      id: string
      name: string
      visibility: 'private' | 'public'
      category: {
        id: string
        name: string
        visibility: 'private' | 'public'
      } | null
      indicators: {
        indicator: {
          id: string
          name: string
          visibility: 'private' | 'public'
          category: {
            id: string
            name: string
            visibility: 'private' | 'public'
          } | null
        } | null
      }[]
    } | null
  }[],
) => {
  const issues = new Map<string, DependencyIssue>()

  for (const usage of usages) {
    const product = usage.productRun?.product ?? null
    const indicator = usage.indicator
    const derivedIndicator = usage.derivedIndicator

    appendIssue(
      issues,
      product
        ? {
            id: product.id,
            name: product.name,
            resourceType: 'product',
            visibility: product.visibility,
          }
        : null,
    )
    appendIssue(
      issues,
      product?.dataset
        ? {
            id: product.dataset.id,
            name: product.dataset.name,
            resourceType: 'dataset',
            visibility: product.dataset.visibility,
          }
        : null,
    )
    appendIssue(
      issues,
      product?.geometries
        ? {
            id: product.geometries.id,
            name: product.geometries.name,
            resourceType: 'geometries',
            visibility: product.geometries.visibility,
          }
        : null,
    )

    appendIssue(
      issues,
      indicator
        ? {
            id: indicator.id,
            name: indicator.name,
            resourceType: 'indicator',
            visibility: indicator.visibility,
          }
        : null,
    )
    appendIssue(
      issues,
      indicator?.category
        ? {
            id: indicator.category.id,
            name: indicator.category.name,
            resourceType: 'indicatorCategory',
            visibility: indicator.category.visibility,
          }
        : null,
    )

    appendIssue(
      issues,
      derivedIndicator
        ? {
            id: derivedIndicator.id,
            name: derivedIndicator.name,
            resourceType: 'derivedIndicator',
            visibility: derivedIndicator.visibility,
          }
        : null,
    )
    appendIssue(
      issues,
      derivedIndicator?.category
        ? {
            id: derivedIndicator.category.id,
            name: derivedIndicator.category.name,
            resourceType: 'indicatorCategory',
            visibility: derivedIndicator.category.visibility,
          }
        : null,
    )

    for (const dependency of derivedIndicator?.indicators ?? []) {
      if (!dependency.indicator) {
        continue
      }

      appendIssue(issues, {
        id: dependency.indicator.id,
        name: dependency.indicator.name,
        resourceType: 'indicator',
        visibility: dependency.indicator.visibility,
      })
      appendIssue(
        issues,
        dependency.indicator.category
          ? {
              id: dependency.indicator.category.id,
              name: dependency.indicator.category.name,
              resourceType: 'indicatorCategory',
              visibility: dependency.indicator.category.visibility,
            }
          : null,
      )
    }
  }

  return Array.from(issues.values())
}

export const assertDerivedIndicatorDependenciesPublic = async (
  tx: DbTransaction,
  derivedIndicatorId: string,
): Promise<void> => {
  const record = await tx.query.derivedIndicator.findFirst({
    where: (table, { eq }) => eq(table.id, derivedIndicatorId),
    columns: {
      id: true,
      name: true,
      visibility: true,
    },
    with: {
      category: {
        columns: {
          id: true,
          name: true,
          visibility: true,
        },
      },
      indicators: {
        with: {
          indicator: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
            with: {
              category: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!record) {
    return
  }

  const issues = new Map<string, DependencyIssue>()

  appendIssue(
    issues,
    record.category
      ? {
          id: record.category.id,
          name: record.category.name,
          resourceType: 'indicatorCategory',
          visibility: record.category.visibility,
        }
      : null,
  )

  for (const dependency of record.indicators) {
    if (!dependency.indicator) {
      continue
    }

    appendIssue(issues, {
      id: dependency.indicator.id,
      name: dependency.indicator.name,
      resourceType: 'indicator',
      visibility: dependency.indicator.visibility,
    })
    appendIssue(
      issues,
      dependency.indicator.category
        ? {
            id: dependency.indicator.category.id,
            name: dependency.indicator.category.name,
            resourceType: 'indicatorCategory',
            visibility: dependency.indicator.category.visibility,
          }
        : null,
    )
  }

  const dependencyIssues = Array.from(issues.values())

  if (dependencyIssues.length > 0) {
    throwDependencyError('derivedIndicator', dependencyIssues)
  }
}

export const assertReportDependenciesPublic = async (
  tx: DbTransaction,
  reportId: string,
): Promise<void> => {
  const usages = await tx.query.reportIndicatorUsage.findMany({
    where: (table, { eq }) => eq(table.reportId, reportId),
    with: {
      productRun: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
            with: {
              dataset: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                },
              },
              geometries: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
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
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
          },
        },
      },
      derivedIndicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
          },
          indicators: {
            with: {
              indicator: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                },
                with: {
                  category: {
                    columns: {
                      id: true,
                      name: true,
                      visibility: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const dependencyIssues = collectUsageDependencyIssues(usages)

  if (dependencyIssues.length > 0) {
    throwDependencyError('report', dependencyIssues)
  }
}

export const assertDashboardDependenciesPublic = async (
  tx: DbTransaction,
  dashboardId: string,
): Promise<void> => {
  const usages = await tx.query.dashboardIndicatorUsage.findMany({
    where: (table, { eq }) => eq(table.dashboardId, dashboardId),
    with: {
      productRun: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
            with: {
              dataset: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                },
              },
              geometries: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
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
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
          },
        },
      },
      derivedIndicator: {
        columns: {
          id: true,
          name: true,
          visibility: true,
        },
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              visibility: true,
            },
          },
          indicators: {
            with: {
              indicator: {
                columns: {
                  id: true,
                  name: true,
                  visibility: true,
                },
                with: {
                  category: {
                    columns: {
                      id: true,
                      name: true,
                      visibility: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const dependencyIssues = collectUsageDependencyIssues(usages)

  if (dependencyIssues.length > 0) {
    throwDependencyError('dashboard', dependencyIssues)
  }
}
