import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { useIndicatorLink } from '../_hooks'

export const IndicatorButtons = ({
  indicators,
}: {
  indicators: { id: string; name: string }[] | undefined
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
  indicator: { id: string; name: string }
}) => {
  const indicatorLink = useIndicatorLink()
  return (
    <BadgeLink href={indicatorLink(indicator)} variant="indicator">
      {indicator.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
