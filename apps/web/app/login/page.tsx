import Link from '../../components/link'
import { getUserServerSession } from '~/utils/getUserServerSession'
import { redirect } from 'next/navigation'
import AuthPageShell from '../_components/auth-page-shell'
import LoginForm from './_components/form'

const Page = async () => {
  const { user } = await getUserServerSession()

  if (user) {
    redirect('/console')
  }

  return (
    <AuthPageShell
      title="Sign in"
      description="Log in to unlock tailored content and stay connected with your community."
      footer={
        <div className="inline-flex justify-center gap-1 self-stretch text-center text-sm leading-5">
          <div className="text-muted-foreground">
            Don&apos;t have an account?
          </div>
          <Link href="/sign-up" className="text-neutral-900 underline">
            Sign up
          </Link>
        </div>
      }
    >
      <LoginForm />
    </AuthPageShell>
  )
}

export default Page
