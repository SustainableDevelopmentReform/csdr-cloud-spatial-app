import { formatDate } from '@repo/ui/lib/date'
import type { ReportSource } from '@repo/schemas/crud'
import Link from 'next/link'
import {
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  PRODUCTS_BASE_PATH,
} from '~/lib/paths'
import { DetailCard } from '~/app/console/_components/detail-cards'

const sourceGroups: {
  resourceType: ReportSource['resourceType']
  title: string
}[] = [
  {
    resourceType: 'product',
    title: 'Products',
  },
  {
    resourceType: 'dataset',
    title: 'Datasets',
  },
  {
    resourceType: 'geometries',
    title: 'Geometries',
  },
]

const getSourceHref = (source: ReportSource) => {
  switch (source.resourceType) {
    case 'product':
      return `${PRODUCTS_BASE_PATH}/${source.id}`
    case 'dataset':
      return `${DATASETS_BASE_PATH}/${source.id}`
    case 'geometries':
      return `${GEOMETRIES_BASE_PATH}/${source.id}`
  }

  return PRODUCTS_BASE_PATH
}

export const ReportSources = ({
  sources,
}: {
  sources: ReportSource[] | undefined
}) => {
  const safeSources = sources ?? []

  return (
    <DetailCard
      title="Sources"
      description="Live references derived from the report chart usage."
      footer={
        safeSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sources referenced in this report.
          </p>
        ) : (
          <div className="grid w-full gap-6">
            {sourceGroups.map((group) => {
              const groupSources = safeSources.filter(
                (source) => source.resourceType === group.resourceType,
              )

              if (groupSources.length === 0) {
                return null
              }

              return (
                <div className="grid gap-3" key={group.resourceType}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="grid gap-3">
                    {groupSources.map((source) => {
                      const href = getSourceHref(source)

                      return (
                        <div
                          className="rounded-md border border-gray-200 p-3"
                          key={`${source.resourceType}:${source.id}`}
                        >
                          <div className="flex flex-col gap-1">
                            <Link
                              href={href}
                              className="font-medium text-blue-600 underline underline-offset-2"
                            >
                              {source.name}
                            </Link>
                            {source.description ? (
                              <p className="text-sm text-muted-foreground">
                                {source.description}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Created {formatDate(source.createdAt)}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {href}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    />
  )
}
