'use client'

import Link from 'next/link'
import { authClient } from '../../utils/auth'
import SignupForm from './_components/form'
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter()
  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      <div className="font-bold text-2xl mb-8 -mt-8 w-full">
        Create your account
      </div>
      <SignupForm
        mutationFn={async (data) => {
          await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
          })
          router.push('/login')
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
