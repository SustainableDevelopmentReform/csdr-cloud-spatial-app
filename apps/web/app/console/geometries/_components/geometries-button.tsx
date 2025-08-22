import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { useGeometriesLink } from '../_hooks'

export const GeometriesButtons = ({
  geometriesSets,
}: {
  geometriesSets: { id: string; name: string }[] | undefined
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
  geometries: { id: string; name: string }
}) => {
  const geometriesLink = useGeometriesLink()

  return (
    <BadgeLink href={geometriesLink(geometries)} variant="geometries">
      {geometries.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
