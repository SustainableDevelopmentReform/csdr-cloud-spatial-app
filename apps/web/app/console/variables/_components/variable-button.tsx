import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'

export const VariableButtons = ({
  variables,
}: {
  variables: { id: string; name: string }[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {variables?.map((variable) => (
        <VariableButton variable={variable} key={variable.id} />
      ))}
    </div>
  )
}

export const VariableButton = ({
  variable,
}: {
  variable: { id: string; name: string }
}) => {
  return (
    <BadgeLink href={`/`} variant="variable">
      {variable.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
