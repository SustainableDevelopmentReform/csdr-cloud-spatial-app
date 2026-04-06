'use client'

import { Button } from '@repo/ui/components/ui/button'
import Link from '~/components/link'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type InvitationState = 'idle' | 'submitting' | 'accepted' | 'error'

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => null)

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Failed to accept invitation'
}

const AcceptInvitationClientPage = () => {
  const authClient = useAuthClient()
  const { apiBaseUrl } = useConfig()
  const router = useRouter()
  const params = useParams<{ invitationId: string }>()
  const invitationId =
    typeof params.invitationId === 'string' ? params.invitationId : ''
  const session = authClient.useSession()
  const [state, setState] = useState<InvitationState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!session.data?.user || invitationId === '' || state !== 'idle') {
      return
    }

    setState('submitting')

    void fetch(`${apiBaseUrl}/api/auth/organization/accept-invitation`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        invitationId,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        setState('accepted')
        router.replace('/console')
      })
      .catch((error: unknown) => {
        setState('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to accept invitation',
        )
      })
  }, [apiBaseUrl, invitationId, router, session.data?.user, state])

  return (
    <div className="flex min-h-screen items-center justify-center px-10">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Organization invitation</h1>
        {!session.data?.user ? (
          <>
            <p className="text-sm text-gray-600">
              Sign in or create an account with the invited email address, then
              reopen this invitation link to accept it.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          </>
        ) : null}
        {session.data?.user && state === 'submitting' ? (
          <p className="text-sm text-gray-600">Accepting invitation...</p>
        ) : null}
        {session.data?.user && state === 'error' ? (
          <>
            <p className="text-sm text-red-600">
              {errorMessage ?? 'Failed to accept invitation'}
            </p>
            <Button asChild variant="outline">
              <Link href="/console/workspace">Open workspace</Link>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default AcceptInvitationClientPage
