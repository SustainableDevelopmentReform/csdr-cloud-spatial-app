import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { GeometriesLinkParams, useGeometriesLink } from '../_hooks'
import { SquareStackIcon } from 'lucide-react'

export const GeometriesButtons = ({
  geometriesSets,
}: {
  geometriesSets: GeometriesLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {geometriesSets?.map((geometries) => (
        <GeometriesButton geometries={geometries} key={geometries.id} />
      ))}
    </div>
  )
}

export const GeometriesButton = ({
  geometries,
}: {
  geometries: GeometriesLinkParams
}) => {
  const geometriesLink = useGeometriesLink()

  return (
    <BadgeLink
      href={geometriesLink(geometries)}
      variant="geometries"
      icon={<SquareStackIcon />}
      adornment={
        <GlobalVisibilityIndicator visibility={geometries.visibility} />
      }
    >
      {geometries.name}
    </BadgeLink>
  )
}
