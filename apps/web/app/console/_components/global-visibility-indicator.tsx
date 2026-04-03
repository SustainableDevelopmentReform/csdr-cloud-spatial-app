'use client'

import { GlobeIcon } from 'lucide-react'
import { ResourceVisibility } from '~/utils/access-control'

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
      <GlobeIcon aria-hidden className="size-3.5" />
    </span>
  )
}
