import { BadgeLink } from '../../../../components/badge-link'
import { withDataLibrarySource } from '~/lib/paths'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { GeometriesLinkParams, useGeometriesLink } from '../_hooks'
import { SquareStackIcon } from 'lucide-react'

export const GeometriesButton = ({
  fromLibrary = false,
  geometries,
}: {
  fromLibrary?: boolean
  geometries: GeometriesLinkParams
}) => {
  const geometriesLink = useGeometriesLink()
  const href = geometriesLink(geometries)

  return (
    <BadgeLink
      href={fromLibrary ? withDataLibrarySource(href) : href}
      icon={<SquareStackIcon />}
      adornment={
        <GlobalVisibilityIndicator visibility={geometries.visibility} />
      }
    >
      {geometries.name}
    </BadgeLink>
  )
}
