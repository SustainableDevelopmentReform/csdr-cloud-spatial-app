import React from 'react'
import { AuthEmailLayout } from './components/layout'

export function PasswordResetEmail(props: {
  userName?: string | null
  resetUrl: string
}) {
  const greeting = props.userName
    ? `${props.userName}, a password reset was requested for your account. If that was you, continue using the secure link below.`
    : 'A password reset was requested for your account. If that was you, continue using the secure link below.'

  return (
    <AuthEmailLayout
      preview="Use this link to reset your CSDR Cloud Spatial password."
      heading="Reset your password"
      lead={greeting}
      actionLabel="Reset password"
      actionUrl={props.resetUrl}
      helperText="This reset link expires in 1 hour."
    />
  )
}
