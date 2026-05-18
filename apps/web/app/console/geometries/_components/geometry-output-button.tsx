import { Badge } from '@repo/ui/components/ui/badge'
import { BadgeLink } from '../../../../components/badge-link'
import { GeometryOutputLinkParams, useGeometryOutputLink } from '../_hooks'
import { SquareStackIcon } from 'lucide-react'

const geometryOutputBadgeClassName =
  'h-[22px] max-w-none border-neutral-300 bg-white text-stone-900 hover:bg-neutral-50 hover:text-stone-900 [&>svg]:text-stone-600'

export const GeometryOutputButton = ({
  geometryOutput,
  onClick,
}: {
  geometryOutput: GeometryOutputLinkParams
  onClick?: () => void
}) => {
  const geometriesRunLink = useGeometryOutputLink()

  if (onClick) {
    return (
      <button
        className="inline-flex max-w-full items-center transition-transform duration-100 ease-out"
        onClick={onClick}
        type="button"
      >
        <Badge variant="outline" className={geometryOutputBadgeClassName}>
          <SquareStackIcon />
          {geometryOutput.name}
        </Badge>
      </button>
    )
  }

  return (
    <BadgeLink
      href={geometriesRunLink(geometryOutput)}
      icon={<SquareStackIcon />}
    >
      {geometryOutput.name}
    </BadgeLink>
  )
}
