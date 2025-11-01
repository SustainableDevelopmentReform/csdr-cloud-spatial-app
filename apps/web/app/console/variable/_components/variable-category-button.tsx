import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { VariableCategoryLinkParams, useVariableCategoryLink } from '../_hooks'

export const VariableCategoryButtons = ({
  variableCategories,
}: {
  variableCategories: VariableCategoryLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {variableCategories?.map((variableCategory) => (
        <VariableCategoryButton
          variableCategory={variableCategory}
          key={variableCategory.id}
        />
      ))}
    </div>
  )
}

export const VariableCategoryButton = ({
  variableCategory,
}: {
  variableCategory: VariableCategoryLinkParams
}) => {
  // const variableCategoryLink = useVariableCategoryLink()

  return <div>{variableCategory.name}</div>

  // return (
  //   <BadgeLink href={variableCategoryLink(variableCategory)} variant="outline">
  //     {variableCategory.name}
  //     <ArrowUpRightIcon className="size-4" />
  //   </BadgeLink>
  // )
}
