'use client'

import { Badge } from '@repo/ui/components/ui/badge'
import { ShieldCheckIcon, ShieldOffIcon } from 'lucide-react'
import { useAuthClient } from '~/hooks/useAuthClient'
import TwoFactorButton from '../../_components/two-factor-dialog'

const TwoFactorPageClient = () => {
  const authClient = useAuthClient()
  const { data } = authClient.useSession()
  const user = data?.user
  const isEnabled = user?.twoFactorEnabled === true
  const isRequired = user?.role === 'super_admin'
  const StatusIcon = isEnabled ? ShieldCheckIcon : ShieldOffIcon

  return (
    <div className="max-w-xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <StatusIcon
            className={
              isEnabled
                ? 'size-5 shrink-0 text-emerald-600'
                : 'size-5 shrink-0 text-amber-700'
            }
          />
          <div>
            <h1 className="text-lg font-semibold">Two-factor Authentication</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isRequired
                ? 'Super admin accounts must use two-factor authentication.'
                : 'Add an extra verification step to protect your account.'}
            </p>
          </div>
        </div>
        <Badge variant={isEnabled ? 'default' : 'destructive'}>
          {isEnabled ? 'Enabled' : 'Not enabled'}
        </Badge>
      </div>

      <TwoFactorButton
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-50"
        icon={
          isEnabled ? (
            <ShieldCheckIcon className="size-4" />
          ) : (
            <ShieldOffIcon className="size-4" />
          )
        }
        label={isEnabled ? 'Manage 2FA' : 'Enable 2FA'}
      />
    </div>
  )
}

export default TwoFactorPageClient
