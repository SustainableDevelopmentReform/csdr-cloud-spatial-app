'use client'

import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { authClient } from '~/utils/auth'

export const SignOutButton = () => {
  const router = useRouter()

  return (
    <Button
      onClick={async () => {
        const res = await authClient.signOut()
        if (res.error) {
          toast.error(res.error.message)
        } else {
          router.push('/')
        }
      }}
    >
      <LogOutIcon className="w-4 h-4" />
      Logout
    </Button>
  )
}
