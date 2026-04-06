import React from 'react'
import { AuthEmailLayout } from './components/layout'

export function OrganizationInvitationEmail(props: {
  acceptUrl: string
  invitationId: string
  inviterEmail: string
  inviterName?: string | null
  organizationName: string
  role: string
}) {
  const inviterLabel = props.inviterName?.trim()
    ? `${props.inviterName} (${props.inviterEmail})`
    : props.inviterEmail

  return (
    <AuthEmailLayout
      preview={`You've been invited to join ${props.organizationName}.`}
      heading={`Join ${props.organizationName}`}
      lead={`${inviterLabel} invited you to join ${props.organizationName} as ${props.role}. Use the secure link below to review the invitation.`}
      actionLabel="Review invitation"
      actionUrl={props.acceptUrl}
      helperText={`Invitation ID: ${props.invitationId}`}
    />
  )
}
