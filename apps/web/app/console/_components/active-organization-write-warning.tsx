'use client'

import { StatusMessage } from '~/components/status-message'
import { ResourceVisibility } from '~/utils/access-control'

export const ActiveOrganizationWriteWarning = ({
  visibility,
}: {
  visibility?: ResourceVisibility | null
}) => {
  const visibilitySentence =
    visibility === 'global'
      ? 'It is visible here because it is global.'
      : 'It is visible here because you can read it from another organization.'

  return (
    <StatusMessage variant="info">
      {visibilitySentence} Switch to the owning organization in the org switcher
      to edit this resource.
    </StatusMessage>
  )
}
