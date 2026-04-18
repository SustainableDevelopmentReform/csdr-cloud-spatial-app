'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@repo/ui/components/ui/sonner'
import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthClient } from '~/hooks/useAuthClient'

export const SignOutButton = ({
  className,
  label = 'Logout',
  onClick,
}: {
  className?: string
  label?: string
  onClick?: () => void
}) => {
  const router = useRouter()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()
  return (
    <button
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-neutral-100'
      }
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
      type="button"
    >
      <LogOutIcon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  )
}
