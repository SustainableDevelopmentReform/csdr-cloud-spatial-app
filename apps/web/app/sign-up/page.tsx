'use client'

import { toast } from '@repo/ui/components/ui/sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '../../utils/auth'
import SignupForm from './_components/form'

const Page = () => {
  const router = useRouter()
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
          })
          if (res.error) {
            throw res.error
          } else {
            router.push('/login')
          }
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
