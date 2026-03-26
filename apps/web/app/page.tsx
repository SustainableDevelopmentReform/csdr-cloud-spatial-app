import { Button } from '@repo/ui/components/ui/button'
import { match } from 'ts-pattern'
import Link from '~/components/link'
import { getUserServerSession } from '~/utils/getUserServerSession'
import { PUBLIC_EXPLORER_BASE_PATH } from '~/lib/paths'
import { SignOutButton } from '../components/sign-out-button'
import { redirect } from 'next/navigation'

export default async function Page() {
  const data = await getUserServerSession()
  const user = data?.user

  if (user) {
    redirect('/console')
  }

  return (
    <main className="flex items-center justify-center min-h-screen">
      <section className="w-max-7xl mx-auto px-6 -mt-12">
        <h1 className="font-mono text-center text-5xl font-semibold leading-tight mb-6">
          CSDR Spatial Cloud App
        </h1>
        <p className="font-mono text-center w-[800px] max-w-[100vw] mx-auto mb-10 text-lg text-gray-600">
          Prototype
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button className="px-8" asChild>
            {match(user)
              .with(null, () => <Link href="/login">Login</Link>)
              .otherwise(() => (
                <SignOutButton />
              ))}
          </Button>
          <Button className="px-8" variant="outline" asChild>
            <Link href={PUBLIC_EXPLORER_BASE_PATH}>Public Explorer</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
