'use client'

import { Button } from '@repo/ui/components/ui/button'
import { LogOutIcon } from 'lucide-react'
import { authClient } from '~/utils/auth'
import { useRouter } from 'next/navigation'

export const SignOutButton = () => {
  const router = useRouter()

  return (
    <Button
      onClick={async () => {
        await authClient.signOut()
        router.push('/')
      }}
    >
      <LogOutIcon className="w-4 h-4" />
      Logout
    </Button>
  )
}
