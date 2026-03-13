import React from 'react'
import { AuthEmailLayout } from './components/layout'

export function OTPEmail(props: { userName?: string | null; otp: string }) {
  const greeting = props.userName
    ? `${props.userName}, enter this code in the sign-in screen to complete your two-factor verification.`
    : 'Enter this code in the sign-in screen to complete your two-factor verification.'

  return (
    <AuthEmailLayout
      preview="Use this verification code to finish signing in."
      heading="Use this verification code"
      lead={greeting}
      code={props.otp}
      helperText="The code expires in a few minutes. Only enter it into the official CSDR Cloud Spatial sign-in screen."
    />
  )
}
