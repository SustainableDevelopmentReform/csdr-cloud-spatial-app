'use client'

import { useRouter } from 'next/navigation'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
import Link from '../../components/link'
import AuthPageShell from '../_components/auth-page-shell'
import SignupForm from './_components/form'

const Page = () => {
  const router = useRouter()
  const authClient = useAuthClient()
  const { appUrl } = useConfig()

  return (
    <AuthPageShell
      title="Sign up"
      description="Create an account to unlock tailored content and stay connected with your community."
      footer={
        <div className="inline-flex justify-center gap-1 self-stretch text-center text-sm leading-5">
          <div className="text-muted-foreground">Already have an account?</div>
          <Link href="/login" className="text-neutral-900 underline">
            Sign in
          </Link>
        </div>
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
    </AuthPageShell>
  )
}

export default Page
