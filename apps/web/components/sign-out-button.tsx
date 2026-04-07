'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthClient } from '~/hooks/useAuthClient'

export const SignOutButton = ({ onClick }: { onClick?: () => void }) => {
  const router = useRouter()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()
  return (
    <Button
      onClick={async () => {
        const res = await authClient.signOut()
        if (res.error) {
          toast.error(res.error.message)
        } else {
          queryClient.invalidateQueries()
          router.push('/')
          onClick?.()
        }
      }}
    >
      <LogOutIcon className="w-4 h-4" />
      Logout
    </Button>
  )
}
