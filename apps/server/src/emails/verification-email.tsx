import React from 'react'
import { AuthEmailLayout } from './components/layout'

export function VerificationEmail(props: {
  userName?: string | null
  verificationUrl: string
}) {
  const greeting = props.userName
    ? `${props.userName}, use the secure link below to confirm your email address and finish setting up your access to CSDR Cloud Spatial.`
    : 'Use the secure link below to confirm your email address and finish setting up your access to CSDR Cloud Spatial.'

  return (
    <AuthEmailLayout
      preview="Confirm your email address to finish setting up your account."
      heading="Confirm your email address"
      lead={greeting}
      actionLabel="Verify email"
      actionUrl={props.verificationUrl}
      helperText="This verification link expires in 24 hours."
    />
  )
}
