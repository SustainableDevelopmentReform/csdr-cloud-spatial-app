import { AudioLinesIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { IndicatorLinkParams, useIndicatorLink } from '../_hooks'

export const IndicatorButtons = ({
  indicators,
}: {
  indicators: IndicatorLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {indicators?.map((indicator) => (
        <IndicatorButton indicator={indicator} key={indicator.id} />
      ))}
    </div>
  )
}

export const IndicatorButton = ({
  indicator,
}: {
  indicator: IndicatorLinkParams
}) => {
  const indicatorLink = useIndicatorLink()
  return (
    <BadgeLink
      href={indicatorLink(indicator)}
      variant="indicator"
      adornment={
        <GlobalVisibilityIndicator visibility={indicator.visibility} />
      }
    >
      {indicator.type === 'derived' && <AudioLinesIcon className="size-4" />}
      {indicator.name}
    </BadgeLink>
  )
}
