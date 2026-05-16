'use client'

import { deriveRunStatus } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import { formatDateTime } from '@repo/ui/lib/date'
import { ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import { withDataLibrarySource } from '~/lib/paths'
import {
  ConsoleSideDrawer,
  ConsoleSideDrawerSection,
} from '../../_components/console-side-drawer'
import { VersionStatusBadge } from '../../_components/version-status-badge'
import { GeometriesButton } from './geometries-button'
import { GeometriesRunButton } from './geometries-run-button'
import {
  type GeometriesLinkParams,
  type GeometriesRunLinkParams,
  useGeometries,
  useGeometriesLink,
  useGeometriesRun,
  useGeometryOutput,
} from '../_hooks'

type GeometryOutputData = ReturnType<typeof useGeometryOutput>['data']

function AboutDetails({
  geometryOutput,
  isLoading,
}: {
  geometryOutput: GeometryOutputData
  isLoading: boolean
}) {
  if (isLoading) {
    return <p className="text-muted-foreground">Loading boundary feature...</p>
  }

  return (
    <p className="text-muted-foreground">
      {geometryOutput?.description ??
        'No description available for this boundary feature.'}
    </p>
  )
}

function PropertiesDetails({ properties }: { properties: unknown }) {
  const propertiesText = JSON.stringify(properties ?? {}, null, 2)

  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-5 text-muted-foreground">
      {propertiesText}
    </pre>
  )
}

function SourceDataDetails({
  geometries,
  geometriesRun,
  isLoading,
}: {
  geometries: GeometriesLinkParams | null | undefined
  geometriesRun: GeometriesRunLinkParams | null | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return <p className="text-muted-foreground">Loading source data...</p>
  }

  if (!geometries && !geometriesRun) {
    return <p className="text-muted-foreground">No source data linked.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {geometries ? (
        <GeometriesButton geometries={geometries} fromLibrary />
      ) : null}
      {geometriesRun ? (
        <GeometriesRunButton geometriesRun={geometriesRun} />
      ) : null}
    </div>
  )
}

export function GeometryOutputDetailsSidebar({
  geometryOutputId,
  onGeometryOutputSelect,
  onClose,
  open,
}: {
  geometryOutputId: string | null
  onGeometryOutputSelect?: (geometryOutputId: string) => void
  onClose: () => void
  open: boolean
}) {
  const { data: geometryOutput, isLoading } = useGeometryOutput(
    geometryOutputId ?? undefined,
  )
  const geometriesRunId = geometryOutput?.geometriesRun.id
  const { data: geometriesRun, isLoading: isGeometriesRunLoading } =
    useGeometriesRun(geometriesRunId, Boolean(geometriesRunId))
  const geometriesId =
    geometryOutput?.geometriesRun.geometries.id ?? geometriesRun?.geometries.id
  const { data: geometries, isLoading: isGeometriesLoading } = useGeometries(
    geometriesId,
    Boolean(geometriesId),
  )
  const geometriesLink = useGeometriesLink()

  const sourceGeometries =
    geometries ??
    geometryOutput?.geometriesRun.geometries ??
    geometriesRun?.geometries
  const sourceGeometriesRun = geometriesRun ?? geometryOutput?.geometriesRun
  const boundaryHref = sourceGeometries
    ? withDataLibrarySource(geometriesLink(sourceGeometries))
    : null
  const headerDescription = geometryOutput?.description ? (
    <p>{geometryOutput.description}</p>
  ) : geometryOutput?.createdAt ? (
    <p>Created {formatDateTime(geometryOutput.createdAt)}</p>
  ) : (
    <p>
      {isLoading
        ? 'Loading boundary feature details...'
        : 'No description available.'}
    </p>
  )
  const runStatus = sourceGeometriesRun
    ? deriveRunStatus({
        latestRunCreatedAt: geometries?.mainRun?.createdAt,
        latestRunId: sourceGeometriesRun.geometries.mainRunId,
        runCreatedAt: geometriesRun?.createdAt,
        runId: sourceGeometriesRun.id,
      })
    : null
  const versionStatusBadge = runStatus ? (
    <VersionStatusBadge status={runStatus} />
  ) : null

  return (
    <ConsoleSideDrawer
      badge={versionStatusBadge}
      closeLabel="Close boundary feature details"
      description={headerDescription}
      footer={
        boundaryHref ? (
          <Button asChild className="w-full" type="button">
            <Link href={boundaryHref}>
              <ExternalLinkIcon className="size-4" />
              Boundary Details
            </Link>
          </Button>
        ) : null
      }
      onClose={onClose}
      onBackRestore={
        geometryOutputId && onGeometryOutputSelect
          ? () => onGeometryOutputSelect(geometryOutputId)
          : undefined
      }
      open={open}
      tagline="Boundary Feature"
      title={
        isLoading ? 'Loading...' : (geometryOutput?.name ?? 'Boundary feature')
      }
    >
      <div className="border-t border-border">
        <ConsoleSideDrawerSection defaultOpen title="About">
          <AboutDetails geometryOutput={geometryOutput} isLoading={isLoading} />
        </ConsoleSideDrawerSection>
        <ConsoleSideDrawerSection title="Properties">
          <PropertiesDetails properties={geometryOutput?.properties} />
        </ConsoleSideDrawerSection>
        <ConsoleSideDrawerSection title="Source data">
          <SourceDataDetails
            geometries={sourceGeometries}
            geometriesRun={sourceGeometriesRun}
            isLoading={isGeometriesLoading || isGeometriesRunLoading}
          />
        </ConsoleSideDrawerSection>
      </div>
    </ConsoleSideDrawer>
  )
}
