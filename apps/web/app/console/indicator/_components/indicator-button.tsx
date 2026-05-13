import { GaugeCircleIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { IndicatorLinkParams, useIndicatorLink } from '../_hooks'

export const IndicatorButton = ({
  indicator,
}: {
  indicator: IndicatorLinkParams
}) => {
  const indicatorLink = useIndicatorLink()
  return (
    <BadgeLink
      href={indicatorLink(indicator)}
      icon={<GaugeCircleIcon />}
      adornment={
        <GlobalVisibilityIndicator visibility={indicator.visibility} />
      }
    >
      {indicator.name}
    </BadgeLink>
  )
}
