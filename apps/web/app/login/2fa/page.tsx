'use client'

import { AuthShell } from '~/components/auth-shell'
import Link from '~/components/link'
import TwoFactorForm from '../_components/two-factor-form'

export default function LoginTwoFactorPage() {
  return (
    <AuthShell
      eyebrow="Two-factor verification"
      title="Finish signing in"
      description="Choose the second-factor method that is available to you for this account."
      footer={
        <>
          Need to start over?{' '}
          <Link href="/login" className="font-semibold text-[#9d3c17]">
            Return to sign in
          </Link>
        </>
      }
      panelClassName="max-w-2xl"
    >
      <TwoFactorForm />
    </AuthShell>
  )
}
