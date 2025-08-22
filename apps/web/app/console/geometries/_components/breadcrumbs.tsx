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
  useGeometries,
  useGeometryOutput,
  useGeometryOutputLink,
  useGeometriesRun,
  useGeometriesRunLink,
  useGeometriesRunsLink,
} from '../_hooks'
import { GeometriesButton } from './geometries-button'
import { GeometriesRunButton } from './geometries-run-button'

export const GeometriesBreadcrumbs = () => {
  const pathname = usePathname()

  const { data: geometries } = useGeometries()
  const { data: geometriesRun } = useGeometriesRun()
  const { data: geometryOutput } = useGeometryOutput()

  const geometriesRunLink = useGeometriesRunLink()
  const geometryOutputLink = useGeometryOutputLink()
  const geometriesRunsLink = useGeometriesRunsLink()
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
            <Link href="/console/geometries">Geometries</Link>
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
        {geometries && pathname?.includes('runs') && (
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
                  <GeometriesRunButton
                    geometriesRun={geometriesRun}
                    isMainRun={
                      !!(
                        geometries?.mainRun &&
                        geometries?.mainRun?.id === geometriesRun.id
                      )
                    }
                  />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {geometriesRun && pathname?.includes('outputs') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`${geometriesRunLink(geometriesRun)}/outputs`}>
                  Outputs
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {geometryOutput && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={geometryOutputLink(geometryOutput)}
                  className="font-mono"
                >
                  {geometryOutput.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
