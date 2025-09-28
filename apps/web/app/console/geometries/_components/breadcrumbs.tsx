'use client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import Link from '../../../../components/link'
import {
  GEOMETRIES_BASE_PATH,
  useGeometries,
  useGeometriesRun,
  useGeometriesRunsLink,
  useGeometryOutput,
  useGeometryRunOutputsLink,
} from '../_hooks'
import { GeometriesButton } from './geometries-button'
import { GeometriesRunButton } from './geometries-run-button'
import { GeometryOutputButton } from './geometry-output-button'

export const GeometriesBreadcrumbs = () => {
  const pathname = usePathname()

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
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={GEOMETRIES_BASE_PATH}>Geometries</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {geometries && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <GeometriesButton geometries={geometries} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {geometries &&
          (pathname?.includes('runs') ||
            geometriesRunFromUrl ||
            geometryOutputFromUrl) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={geometriesRunsLink(geometries)}>Runs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}

        {geometriesRun && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <div className="flex items-center gap-1">
                  <GeometriesRunButton geometriesRun={geometriesRun} />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {geometriesRun &&
          (pathname?.includes('outputs') || geometryOutputFromUrl) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={geometryRunOutputsLink(geometriesRun)}>
                    Outputs
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
        {geometryOutputFromUrl && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <GeometryOutputButton geometryOutput={geometryOutputFromUrl} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
