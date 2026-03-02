'use client'

import Link from '~/components/link'
import TwoFactorForm from '../_components/two-factor-form'

export default function LoginTwoFactorPage() {
  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      <TwoFactorForm />
      <div className="text-sm mt-12">
        Need to start over?{' '}
        <Link href="/login" className="text-blue-500">
          Return to sign in
        </Link>
      </div>
    </div>
  )
}
