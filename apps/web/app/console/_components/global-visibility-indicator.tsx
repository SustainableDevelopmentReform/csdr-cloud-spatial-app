'use client'

import { ResourceVisibility } from '~/utils/access-control'
import { ResourceVisibilityIcon } from './resource-visibility-icon'

export const GlobalVisibilityIndicator = ({
  visibility,
}: {
  visibility?: ResourceVisibility | null
}) => {
  if (visibility !== 'global') {
    return null
  }

  return (
    <span
      aria-label="Global resource"
      className="inline-flex items-center justify-center rounded-full p-0.5"
      title="Global resource"
    >
      <ResourceVisibilityIcon visibility="global" className="size-3.5" />
    </span>
  )
}
