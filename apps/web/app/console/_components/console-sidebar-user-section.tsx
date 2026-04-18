'use client'

import { UserDropdown } from './user-dropdown'

type ConsoleSidebarUserSectionProps = {
  userEmail: string | null
  userRoleLabel: string
}

export const ConsoleSidebarUserSection = ({
  userEmail,
  userRoleLabel,
}: ConsoleSidebarUserSectionProps) => {
  if (!userEmail) {
    return null
  }

  return <UserDropdown userEmail={userEmail} userRoleLabel={userRoleLabel} />
}
