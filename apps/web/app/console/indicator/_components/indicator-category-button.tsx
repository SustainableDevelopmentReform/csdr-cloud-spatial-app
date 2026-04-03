import { IndicatorCategoryLinkParams } from '../_hooks'

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
  return <div>{indicatorCategory.name}</div>
}
