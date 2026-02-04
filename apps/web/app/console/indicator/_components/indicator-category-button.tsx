import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import {
  IndicatorCategoryLinkParams,
  useIndicatorCategoryLink,
} from '../_hooks'

export const IndicatorCategoryButtons = ({
  indicatorCategories,
}: {
  indicatorCategories: IndicatorCategoryLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {indicatorCategories?.map((indicatorCategory) => (
        <IndicatorCategoryButton
          indicatorCategory={indicatorCategory}
          key={indicatorCategory.id}
        />
      ))}
    </div>
  )
}

export const IndicatorCategoryButton = ({
  indicatorCategory,
}: {
  indicatorCategory: IndicatorCategoryLinkParams
}) => {
  // const indicatorCategoryLink = useIndicatorCategoryLink()

  return <div>{indicatorCategory.name}</div>

  // return (
  //   <BadgeLink href={indicatorCategoryLink(indicatorCategory)} variant="outline">
  //     {indicatorCategory.name}
  //     <ArrowUpRightIcon className="size-4" />
  //   </BadgeLink>
  // )
}
