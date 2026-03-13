'use client'

import { useRouter } from 'next/navigation'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
import Link from '../../components/link'
import SignupForm from './_components/form'

const Page = () => {
  const router = useRouter()
  const authClient = useAuthClient()
  const { appUrl } = useConfig()

  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      <div className="font-bold text-2xl mb-8 -mt-8 w-full">
        Create your account
      </div>
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
      <div className="text-sm mt-12">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-500">
          Log in
        </Link>
      </div>
    </div>
  )
}

export default Page
