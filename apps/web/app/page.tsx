import { Button } from '@repo/ui/components/ui/button'
import { match } from 'ts-pattern'
import Link from '~/components/link'
import { getUserServerSession } from '~/utils/getUserServerSession'
import { SignOutButton } from './_components/sign-out-button'

export default async function Page() {
  const data = await getUserServerSession()
  const user = data?.user

  return (
    <main className="flex items-center justify-center min-h-screen">
      <section className="w-max-7xl mx-auto px-6 -mt-12">
        <h1 className="text-center text-5xl font-semibold leading-tight mb-6">
          CSDR Spatial Cloud App
        </h1>
        <p className="text-center max-w-2xl mx-auto mb-10 text-lg text-gray-600">
          Prototype
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button className="px-8" asChild>
            {match(user)
              .with(undefined, () => <Link href="/login">Login</Link>)
              .otherwise(() => (
                <SignOutButton />
              ))}
          </Button>
        </div>
        {user && (
          <div className="border border-gray-300 w-max mx-auto mt-8 px-6 py-4 rounded-lg bg-gray-50">
            <div>Name: {user.name}</div>
            <div>Email: {user.email}</div>
          </div>
        )}
      </section>
    </main>
  )
}
