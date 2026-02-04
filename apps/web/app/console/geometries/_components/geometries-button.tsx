import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesLinkParams, useGeometriesLink } from '../_hooks'

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
    <BadgeLink href={geometriesLink(geometries)} variant="geometries">
      {geometries.name}
    </BadgeLink>
  )
}
