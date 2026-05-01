import { Eye, Globe2, LockKeyhole } from 'lucide-react'
import type { ComponentProps } from 'react'
import type { ResourceVisibility } from '~/utils/access-control'

type ResourceVisibilityIconProps = ComponentProps<typeof LockKeyhole> & {
  visibility?: ResourceVisibility | null
}

export const ResourceVisibilityIcon = ({
  visibility,
  ...props
}: ResourceVisibilityIconProps) => {
  switch (visibility) {
    case 'global':
      return <Globe2 aria-hidden {...props} />
    case 'public':
      return <Eye aria-hidden {...props} />
    case 'private':
    case null:
    case undefined:
      return <LockKeyhole aria-hidden {...props} />
    default: {
      const exhaustiveCheck: never = visibility
      return exhaustiveCheck
    }
  }
}
