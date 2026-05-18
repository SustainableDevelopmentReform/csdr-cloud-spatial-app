'use client'

import {
  deriveRunStatus,
  type RunStatus,
  workflowDagSimpleSchema,
} from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { formatDateTime } from '@repo/ui/lib/date'
import {
  EarthIcon,
  ExternalLinkIcon,
  SquareFunctionIcon,
  SquareStackIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { withDataLibrarySource } from '~/lib/paths'
import { DatasetButton } from '../dataset/_components/dataset-button'
import {
  type DatasetDetail,
  type DatasetRunDetail,
  useDataset,
  useDatasetRun,
  useDatasetRunLink,
} from '../dataset/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import {
  type GeometriesDetail,
  type GeometriesRunDetail,
  useGeometries,
  useGeometriesRun,
  useGeometriesRunLink,
} from '../geometries/_hooks'
import { ProductButton } from '../product/_components/product-button'
import {
  type ProductDetail,
  type ProductRunDetail,
  useProduct,
  useProductRun,
  useProductRunLink,
} from '../product/_hooks'
import {
  ConsoleSideDrawer,
  ConsoleSideDrawerSection,
  type ConsoleSideDrawerOpenSource,
  useConsoleSideDrawerStack,
} from './console-side-drawer'
import { MainRunBadge } from './main-run-badge'
import { VersionStatusBadge } from './version-status-badge'

export type RunVersionType = 'dataset' | 'geometries' | 'product'

export type RunVersionSelection = {
  id: string
  type: RunVersionType
}

type RunVersionSidebarContextValue = {
  closeRunVersion: () => void
  openRunVersion: (
    run: RunVersionSelection,
    options?: { source?: ConsoleSideDrawerOpenSource },
  ) => void
  selectedRun: RunVersionSelection | null
}

const RunVersionSidebarContext =
  createContext<RunVersionSidebarContextValue | null>(null)

const nullableWorkflowDagSimpleSchema = workflowDagSimpleSchema.nullable()

export const useRunVersionSidebar = () => useContext(RunVersionSidebarContext)

const getWorkflowMethods = (workflowDagSimple: unknown) => {
  const parsed = nullableWorkflowDagSimpleSchema.safeParse(
    workflowDagSimple ?? null,
  )

  if (!parsed.success || !parsed.data) {
    return []
  }

  return parsed.data.methods
}

const getRunStatusBadge = (status: RunStatus | null) => {
  if (status === null) {
    return null
  }

  return <VersionStatusBadge status={status} />
}

const SourceVersionButton = ({
  icon,
  isLatest,
  name,
  onClick,
  resourceLabel,
}: {
  icon: ReactNode
  isLatest: boolean
  name: string
  onClick: () => void
  resourceLabel: string
}) => {
  return (
    <button
      aria-label={`Open ${resourceLabel} version ${name}`}
      className="inline-flex h-[22px] max-w-full shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-neutral-300 bg-white px-2 py-0 text-xs font-medium text-stone-900 transition-[color,box-shadow] hover:bg-neutral-50 hover:text-stone-900 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:text-stone-600"
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="min-w-0 truncate">{name}</span>
      <SquareFunctionIcon />
      {isLatest ? <MainRunBadge size="xs" /> : null}
    </button>
  )
}

const SourceVersionDetails = ({
  description,
  isLoading,
  label,
  resource,
  version,
}: {
  description?: string | null
  isLoading: boolean
  label: string
  resource: ReactNode
  version: ReactNode
}) => {
  return (
    <div className="space-y-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="space-y-1.5">
        <p className="text-xs font-medium leading-4 text-muted-foreground">
          {label}
        </p>
        <div className="flex flex-wrap gap-2">{resource}</div>
        {isLoading ? (
          <p className="text-muted-foreground">
            Loading {label.toLowerCase()} details...
          </p>
        ) : description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium leading-4 text-muted-foreground">
          Version
        </p>
        <div className="flex flex-wrap gap-2">{version}</div>
      </div>
    </div>
  )
}

const ProductRunSourceVersions = ({
  onSelect,
  productRun,
}: {
  onSelect: (selection: RunVersionSelection) => void
  productRun: ProductRunDetail | null | undefined
}) => {
  const datasetRun = productRun?.datasetRun
  const geometriesRun = productRun?.geometriesRun
  const sourceDatasetId = datasetRun?.dataset.id
  const sourceGeometriesId = geometriesRun?.geometries.id
  const sourceDatasetQuery = useDataset(
    sourceDatasetId,
    Boolean(sourceDatasetId),
  )
  const sourceGeometriesQuery = useGeometries(
    sourceGeometriesId,
    Boolean(sourceGeometriesId),
  )

  if (!datasetRun && !geometriesRun) {
    return null
  }

  return (
    <div className="space-y-3">
      {datasetRun ? (
        <SourceVersionDetails
          description={sourceDatasetQuery.data?.description}
          isLoading={sourceDatasetQuery.isLoading}
          label="Dataset"
          resource={
            <DatasetButton
              dataset={sourceDatasetQuery.data ?? datasetRun.dataset}
              fromLibrary
            />
          }
          version={
            <SourceVersionButton
              icon={<EarthIcon />}
              isLatest={datasetRun.dataset.mainRunId === datasetRun.id}
              name={datasetRun.name}
              onClick={() => onSelect({ id: datasetRun.id, type: 'dataset' })}
              resourceLabel="dataset"
            />
          }
        />
      ) : null}
      {geometriesRun ? (
        <SourceVersionDetails
          description={sourceGeometriesQuery.data?.description}
          isLoading={sourceGeometriesQuery.isLoading}
          label="Boundary set"
          resource={
            <GeometriesButton
              geometries={
                sourceGeometriesQuery.data ?? geometriesRun.geometries
              }
              fromLibrary
            />
          }
          version={
            <SourceVersionButton
              icon={<SquareStackIcon />}
              isLatest={geometriesRun.geometries.mainRunId === geometriesRun.id}
              name={geometriesRun.name}
              onClick={() =>
                onSelect({ id: geometriesRun.id, type: 'geometries' })
              }
              resourceLabel="boundary"
            />
          }
        />
      ) : null}
    </div>
  )
}

const RootResourceDetails = ({
  button,
  description,
  isLoading,
  label,
}: {
  button: ReactNode
  description?: string | null
  isLoading: boolean
  label: string
}) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{button}</div>
      {isLoading ? (
        <p className="text-muted-foreground">
          Loading {label.toLowerCase()} details...
        </p>
      ) : description ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

const RunRootResourceDetails = ({
  dataset,
  datasetRun,
  geometries,
  geometriesRun,
  isDatasetLoading,
  isGeometriesLoading,
  isProductLoading,
  product,
  productRun,
  selectedRun,
}: {
  dataset: DatasetDetail | null | undefined
  datasetRun: DatasetRunDetail | null | undefined
  geometries: GeometriesDetail | null | undefined
  geometriesRun: GeometriesRunDetail | null | undefined
  isDatasetLoading: boolean
  isGeometriesLoading: boolean
  isProductLoading: boolean
  product: ProductDetail | null | undefined
  productRun: ProductRunDetail | null | undefined
  selectedRun: RunVersionSelection | null
}) => {
  if (selectedRun?.type === 'dataset' && datasetRun) {
    const rootDataset = dataset ?? datasetRun.dataset

    return (
      <RootResourceDetails
        button={<DatasetButton dataset={rootDataset} fromLibrary />}
        description={dataset?.description}
        isLoading={isDatasetLoading}
        label="dataset"
      />
    )
  }

  if (selectedRun?.type === 'geometries' && geometriesRun) {
    const rootGeometries = geometries ?? geometriesRun.geometries

    return (
      <RootResourceDetails
        button={<GeometriesButton geometries={rootGeometries} fromLibrary />}
        description={geometries?.description}
        isLoading={isGeometriesLoading}
        label="boundary set"
      />
    )
  }

  if (selectedRun?.type === 'product' && productRun) {
    const rootProduct = product ?? productRun.product

    return (
      <RootResourceDetails
        button={<ProductButton product={rootProduct} fromLibrary />}
        description={product?.description}
        isLoading={isProductLoading}
        label="product"
      />
    )
  }

  return null
}

const RunVersionArchivalRecord = ({
  createdAt,
  isLoading,
  methods,
  rootResource,
  rootResourceTitle,
  sourceVersions,
  updatedAt,
}: {
  createdAt?: string | Date | null
  isLoading: boolean
  methods: string[]
  rootResource?: ReactNode
  rootResourceTitle?: string
  sourceVersions?: ReactNode
  updatedAt?: string | Date | null
}) => {
  if (isLoading) {
    return (
      <div className="border-t border-border">
        <ConsoleSideDrawerSection defaultOpen title="Archival Record">
          <p className="text-muted-foreground">Loading archival record...</p>
        </ConsoleSideDrawerSection>
      </div>
    )
  }

  return (
    <div className="border-t border-border">
      {rootResource ? (
        <ConsoleSideDrawerSection
          defaultOpen
          title={rootResourceTitle ?? 'Resource'}
        >
          {rootResource}
        </ConsoleSideDrawerSection>
      ) : null}
      <ConsoleSideDrawerSection defaultOpen title="Archival Record">
        <dl className="space-y-4 text-muted-foreground">
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Created</dt>
            <dd>{createdAt ? formatDateTime(createdAt) : 'Unknown'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Updated</dt>
            <dd>{updatedAt ? formatDateTime(updatedAt) : 'Unknown'}</dd>
          </div>
          <div className="space-y-2">
            <dt className="font-medium text-foreground">Method</dt>
            <dd>
              {methods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {methods.map((method) => (
                    <Badge
                      key={method}
                      variant="outline"
                      className="max-w-full"
                    >
                      <span className="truncate">{method}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <span>No method information available.</span>
              )}
            </dd>
          </div>
        </dl>
      </ConsoleSideDrawerSection>
      {sourceVersions ? (
        <ConsoleSideDrawerSection defaultOpen title="Source versions">
          {sourceVersions}
        </ConsoleSideDrawerSection>
      ) : null}
    </div>
  )
}

const getActiveRun = ({
  datasetRun,
  geometriesRun,
  productRun,
  selectedRun,
}: {
  datasetRun: DatasetRunDetail | null | undefined
  geometriesRun: GeometriesRunDetail | null | undefined
  productRun: ProductRunDetail | null | undefined
  selectedRun: RunVersionSelection | null
}) => {
  if (selectedRun?.type === 'dataset') {
    return datasetRun
  }

  if (selectedRun?.type === 'geometries') {
    return geometriesRun
  }

  if (selectedRun?.type === 'product') {
    return productRun
  }

  return null
}

const RunVersionSidebar = ({
  onBackRestore,
  onClose,
  onSelect,
  openSource,
  selectedRun,
}: {
  onBackRestore: (selection: RunVersionSelection) => void
  onClose: () => void
  onSelect: (selection: RunVersionSelection) => void
  openSource: ConsoleSideDrawerOpenSource
  selectedRun: RunVersionSelection | null
}) => {
  const datasetRunId =
    selectedRun?.type === 'dataset' ? selectedRun.id : undefined
  const geometriesRunId =
    selectedRun?.type === 'geometries' ? selectedRun.id : undefined
  const productRunId =
    selectedRun?.type === 'product' ? selectedRun.id : undefined
  const datasetRunQuery = useDatasetRun(datasetRunId, Boolean(datasetRunId))
  const geometriesRunQuery = useGeometriesRun(
    geometriesRunId,
    Boolean(geometriesRunId),
  )
  const productRunQuery = useProductRun(productRunId, Boolean(productRunId))
  const datasetId = datasetRunQuery.data?.dataset.id
  const geometriesId = geometriesRunQuery.data?.geometries.id
  const productId = productRunQuery.data?.product.id
  const datasetQuery = useDataset(datasetId, Boolean(datasetId))
  const geometriesQuery = useGeometries(geometriesId, Boolean(geometriesId))
  const productQuery = useProduct(productId, Boolean(productId))
  const datasetRunLink = useDatasetRunLink()
  const geometriesRunLink = useGeometriesRunLink()
  const productRunLink = useProductRunLink()

  const activeRun = getActiveRun({
    datasetRun: datasetRunQuery.data,
    geometriesRun: geometriesRunQuery.data,
    productRun: productRunQuery.data,
    selectedRun,
  })
  const isLoading =
    selectedRun?.type === 'dataset'
      ? datasetRunQuery.isLoading
      : selectedRun?.type === 'geometries'
        ? geometriesRunQuery.isLoading
        : selectedRun?.type === 'product'
          ? productRunQuery.isLoading
          : false
  const hasError =
    selectedRun?.type === 'dataset'
      ? datasetRunQuery.isError
      : selectedRun?.type === 'geometries'
        ? geometriesRunQuery.isError
        : selectedRun?.type === 'product'
          ? productRunQuery.isError
          : false
  const latestRunId =
    selectedRun?.type === 'dataset'
      ? datasetRunQuery.data?.dataset.mainRunId
      : selectedRun?.type === 'geometries'
        ? geometriesRunQuery.data?.geometries.mainRunId
        : selectedRun?.type === 'product'
          ? productRunQuery.data?.product.mainRunId
          : null
  const latestRunCreatedAt =
    selectedRun?.type === 'dataset'
      ? datasetQuery.data?.mainRun?.createdAt
      : selectedRun?.type === 'geometries'
        ? geometriesQuery.data?.mainRun?.createdAt
        : selectedRun?.type === 'product'
          ? productQuery.data?.mainRun?.createdAt
          : null
  const runStatus = activeRun
    ? deriveRunStatus({
        latestRunCreatedAt,
        latestRunId,
        runCreatedAt: activeRun.createdAt,
        runId: activeRun.id,
      })
    : null
  const detailsHref =
    selectedRun?.type === 'dataset' && datasetRunQuery.data
      ? withDataLibrarySource(datasetRunLink(datasetRunQuery.data))
      : selectedRun?.type === 'geometries' && geometriesRunQuery.data
        ? withDataLibrarySource(geometriesRunLink(geometriesRunQuery.data))
        : selectedRun?.type === 'product' && productRunQuery.data
          ? withDataLibrarySource(productRunLink(productRunQuery.data))
          : null
  const methods = getWorkflowMethods(activeRun?.workflowDagSimple)
  const descriptionFallback = activeRun?.createdAt
    ? `Created ${formatDateTime(activeRun.createdAt)}`
    : hasError
      ? 'Failed to load version details.'
      : 'Loading version details...'
  const description = activeRun?.description || descriptionFallback
  const hasProductRunSourceVersions =
    Boolean(productRunQuery.data?.datasetRun) ||
    Boolean(productRunQuery.data?.geometriesRun)
  const sourceVersions =
    selectedRun?.type === 'product' && hasProductRunSourceVersions ? (
      <ProductRunSourceVersions
        onSelect={onSelect}
        productRun={productRunQuery.data}
      />
    ) : null
  const rootResourceTitle =
    selectedRun?.type === 'dataset'
      ? 'Dataset'
      : selectedRun?.type === 'geometries'
        ? 'Boundary'
        : selectedRun?.type === 'product'
          ? 'Product'
          : undefined
  const rootResource = activeRun ? (
    <RunRootResourceDetails
      dataset={datasetQuery.data}
      datasetRun={datasetRunQuery.data}
      geometries={geometriesQuery.data}
      geometriesRun={geometriesRunQuery.data}
      isDatasetLoading={datasetQuery.isLoading}
      isGeometriesLoading={geometriesQuery.isLoading}
      isProductLoading={productQuery.isLoading}
      product={productQuery.data}
      productRun={productRunQuery.data}
      selectedRun={selectedRun}
    />
  ) : null

  return (
    <ConsoleSideDrawer
      badge={getRunStatusBadge(runStatus)}
      closeLabel="Close version details"
      description={<p>{description}</p>}
      footer={
        detailsHref ? (
          <Button
            asChild
            className="w-full bg-neutral-950 text-white hover:bg-neutral-800"
            type="button"
          >
            <Link href={detailsHref}>
              <ExternalLinkIcon className="size-4" />
              Version details
            </Link>
          </Button>
        ) : null
      }
      onClose={onClose}
      onBackRestore={selectedRun ? () => onBackRestore(selectedRun) : undefined}
      open={selectedRun !== null}
      openSource={openSource}
      tagline="Version"
      title={activeRun?.name ?? (isLoading ? 'Loading...' : 'Version')}
    >
      <RunVersionArchivalRecord
        createdAt={activeRun?.createdAt}
        isLoading={isLoading}
        methods={methods}
        rootResource={rootResource}
        rootResourceTitle={rootResourceTitle}
        sourceVersions={sourceVersions}
        updatedAt={activeRun?.updatedAt}
      />
    </ConsoleSideDrawer>
  )
}

export const RunVersionSidebarProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { closeActiveDrawer, pushActiveDrawerSnapshot } =
    useConsoleSideDrawerStack()
  const [selectedRun, setSelectedRun] = useState<RunVersionSelection | null>(
    null,
  )
  const [openSource, setOpenSource] =
    useState<ConsoleSideDrawerOpenSource>('root')

  const closeRunVersion = useCallback(() => {
    setSelectedRun(null)
    setOpenSource('root')
  }, [])

  const restoreRunVersion = useCallback((run: RunVersionSelection) => {
    setSelectedRun(run)
  }, [])

  const openRunVersion = useCallback(
    (
      run: RunVersionSelection,
      options?: { source?: ConsoleSideDrawerOpenSource },
    ) => {
      const source = options?.source ?? 'root'

      if (source === 'drawer' && selectedRun) {
        pushActiveDrawerSnapshot()
      }

      if (source === 'root') {
        closeActiveDrawer()
      }

      setOpenSource(source)
      setSelectedRun(run)
    },
    [closeActiveDrawer, pushActiveDrawerSnapshot, selectedRun],
  )

  useEffect(() => {
    if (!selectedRun) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRunVersion()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeRunVersion, selectedRun])

  const contextValue = useMemo(
    () => ({
      closeRunVersion,
      openRunVersion,
      selectedRun,
    }),
    [closeRunVersion, openRunVersion, selectedRun],
  )

  return (
    <RunVersionSidebarContext.Provider value={contextValue}>
      {children}
      <RunVersionSidebar
        onBackRestore={restoreRunVersion}
        onClose={closeRunVersion}
        onSelect={(run) => openRunVersion(run, { source: 'drawer' })}
        openSource={openSource}
        selectedRun={selectedRun}
      />
    </RunVersionSidebarContext.Provider>
  )
}
