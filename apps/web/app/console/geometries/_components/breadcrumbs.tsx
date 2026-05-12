'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import {
  DATA_LIBRARY_BASE_PATH,
  DATA_LIBRARY_SOURCE_PARAM,
  GEOMETRIES_BASE_PATH,
  GEOMETRIES_RUNS_BASE_PATH,
  GEOMETRIES_RUNS_OUTPUTS_BASE_PATH,
  isDataLibrarySource,
  withDataLibrarySource,
} from '../../../../lib/paths'
import {
  useGeometries,
  useGeometriesRun,
  useGeometriesRunsLink,
  useGeometryOutput,
  useGeometryRunOutputsLink,
} from '../_hooks'

type BreadcrumbItem = {
  href?: string
  label: string
}

export const GeometriesBreadcrumbs = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromLibrary = isDataLibrarySource(
    searchParams.get(DATA_LIBRARY_SOURCE_PARAM),
  )

  const { data: geometriesFromUrl } = useGeometries()
  const { data: geometriesRunFromUrl } = useGeometriesRun()
  const { data: geometryOutputFromUrl } = useGeometryOutput()

  const geometries =
    geometriesFromUrl ??
    geometriesRunFromUrl?.geometries ??
    geometryOutputFromUrl?.geometriesRun?.geometries
  const geometriesRun =
    geometriesRunFromUrl ?? geometryOutputFromUrl?.geometriesRun

  const geometriesRunsLink = useGeometriesRunsLink()
  const geometryRunOutputsLink = useGeometryRunOutputsLink()
  const sectionHref = fromLibrary
    ? `${DATA_LIBRARY_BASE_PATH}?resourceType=boundary`
    : GEOMETRIES_BASE_PATH

  const items: BreadcrumbItem[] = [
    fromLibrary
      ? { label: 'Data', href: DATA_LIBRARY_BASE_PATH }
      : { label: 'Admin' },
    { label: 'Boundaries', href: sectionHref },
  ]

  if (geometries) {
    items.push({
      label: geometries.name,
      href: fromLibrary
        ? withDataLibrarySource(`${GEOMETRIES_BASE_PATH}/${geometries.id}`)
        : `${GEOMETRIES_BASE_PATH}/${geometries.id}`,
    })
  }

  if (
    geometries &&
    (pathname?.includes('runs') ||
      geometriesRunFromUrl ||
      geometryOutputFromUrl)
  ) {
    items.push({
      label: 'Boundary Runs',
      href: geometriesRunsLink(geometries),
    })
  }

  if (geometriesRun) {
    items.push({
      label: geometriesRun.name,
      href: fromLibrary
        ? withDataLibrarySource(
            `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRun.id}`,
          )
        : `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRun.id}`,
    })
  }

  if (
    geometriesRun &&
    (pathname?.includes('outputs') || geometryOutputFromUrl)
  ) {
    items.push({
      label: 'Outputs',
      href: geometryRunOutputsLink(geometriesRun),
    })
  }

  if (geometryOutputFromUrl) {
    items.push({
      label: geometryOutputFromUrl.name,
      href: fromLibrary
        ? withDataLibrarySource(
            `${GEOMETRIES_RUNS_OUTPUTS_BASE_PATH}/${geometryOutputFromUrl.id}`,
          )
        : `${GEOMETRIES_RUNS_OUTPUTS_BASE_PATH}/${geometryOutputFromUrl.id}`,
    })
  }

  return <ConsoleSimpleBreadcrumbs items={items} />
}
