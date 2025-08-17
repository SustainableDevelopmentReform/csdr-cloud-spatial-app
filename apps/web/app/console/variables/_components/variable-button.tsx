import { Badge } from '@repo/ui/components/ui/badge'
import Link from '../../../../components/link'
import { ArrowUpRightIcon } from 'lucide-react'

export const VariableButton = ({
  variable,
}: {
  variable: { id: string; name: string }
}) => {
  return (
    <Link href={`/`}>
      <Badge color="primary" variant="outline">
        {variable.name}
        <ArrowUpRightIcon className="size-4" />
      </Badge>
    </Link>
  )
}
