import { AuthShell } from '~/components/auth-shell'
import Link from '../../components/link'
import LoginForm from './_components/form'

const Page = () => {
  return (
    <AuthShell
      eyebrow="Sign in"
      title="Return to your workspace"
      description="Use your account password first. If your account has two-factor protection enabled, the challenge step will continue automatically."
      footer={
        <>
          Don't have an account yet?{' '}
          <Link href="/sign-up" className="font-semibold text-[#9d3c17]">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}

export default Page
