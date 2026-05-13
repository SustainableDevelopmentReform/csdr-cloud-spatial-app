import { IndicatorCategoryLinkParams } from '../_hooks'

export const IndicatorCategoryButton = ({
  indicatorCategory,
}: {
  indicatorCategory: IndicatorCategoryLinkParams
}) => {
  return <div>{indicatorCategory.name}</div>
}
