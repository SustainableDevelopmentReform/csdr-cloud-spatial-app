import Link from '../../components/link'
import LoginForm from './_components/form'

const Page = () => {
  console.log('h')
  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      <div className="font-bold text-2xl mb-8 -mt-8 w-full">
        Log in to your account
      </div>
      <LoginForm />
      <div className="text-sm mt-12">
        Don't have account yet?{' '}
        <Link href="/sign-up" className="text-blue-500">
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default Page
