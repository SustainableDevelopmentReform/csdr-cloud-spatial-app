'use client'

import { useRouter } from 'next/navigation'
import { AuthShell } from '~/components/auth-shell'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
import Link from '../../components/link'
import SignupForm from './_components/form'

const Page = () => {
  const router = useRouter()
  const authClient = useAuthClient()
  const { appUrl } = useConfig()

  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up your access"
      description="Your account starts with password-based sign-in. If email verification is required in this environment, we will send the confirmation link after registration."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#9d3c17]">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm
        mutationFn={async (data) => {
          const res = await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
            callbackURL: `${appUrl}/login?emailVerified=1`,
          })

          if (res.error) {
            throw res.error
          }

          if (res.data && 'token' in res.data && res.data.token === null) {
            router.push(
              `/verify-email/pending?email=${encodeURIComponent(data.email)}`,
            )
            return
          }

          router.push('/')
        }}
      />
    </AuthShell>
  )
}

export default Page
