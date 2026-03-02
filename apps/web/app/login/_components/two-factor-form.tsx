'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Switch } from '@repo/ui/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Mail, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { OTPCodeInput } from '~/components/otp-code-input'
import Link from '~/components/link'
import { useAuthClient } from '~/hooks/useAuthClient'
import { getAuthErrorMessage } from '~/utils/auth-errors'

interface TwoFactorFormProps {
  onCancel?: () => void
  onSuccess?: () => void
}

export default function TwoFactorForm(props: TwoFactorFormProps) {
  const authClient = useAuthClient()
  const router = useRouter()
  const [tab, setTab] = useState('totp')
  const [totpCode, setTotpCode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [emailOtpSent, setEmailOtpSent] = useState(false)

  const finishSuccess = () => {
    if (props.onSuccess) {
      props.onSuccess()
      return
    }

    router.push('/')
  }

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.sendOtp()

      if (res.error) {
        throw res.error
      }

      setEmailOtpSent(true)
      setTab('email')
      toast.success('Verification code sent')
    },
    onError(error) {
      toast.error(getAuthErrorMessage(error))
    },
  })

  const verifyTotpMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.verifyTotp({
        code: totpCode,
        trustDevice,
      })

      if (res.error) {
        throw res.error
      }

      finishSuccess()
    },
    onError(error) {
      toast.error(getAuthErrorMessage(error))
    },
  })

  const verifyEmailOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.verifyOtp({
        code: emailCode,
        trustDevice,
      })

      if (res.error) {
        throw res.error
      }

      finishSuccess()
    },
    onError(error) {
      toast.error(getAuthErrorMessage(error))
    },
  })

  const verifyBackupCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.verifyBackupCode({
        code: backupCode,
        trustDevice,
      })

      if (res.error) {
        throw res.error
      }

      finishSuccess()
    },
    onError(error) {
      toast.error(getAuthErrorMessage(error))
    },
  })

  const emailHint = useMemo(() => {
    if (!emailOtpSent) {
      return 'Request an email code if you cannot access your authenticator right now.'
    }

    return 'A fresh email code has been issued for this sign-in challenge.'
  }, [emailOtpSent])

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Two-factor verification
          </div>
          <div className="mt-2 text-2xl font-semibold text-stone-950">
            Finish signing in
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Choose the second-factor method that is available to you for this
            account.
          </p>
        </div>
        {props.onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-stone-600 hover:text-stone-900"
            onClick={props.onCancel}
          >
            Back
          </Button>
        ) : (
          <Link href="/login" className="text-sm font-medium text-[#9d3c17]">
            Back to login
          </Link>
        )}
      </div>

      <div className="mb-5 rounded-[28px] border border-stone-900/10 bg-white/60 px-5 py-4">
        <div className="text-sm font-semibold text-stone-900">
          Trust this device
        </div>
        <div className="mt-1 text-sm leading-6 text-stone-600">
          Skip another two-factor prompt on this browser for the next 30 days.
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-stone-900/10 bg-[#fcf7ef] px-4 py-3">
          <div className="text-sm text-stone-700">Remember this browser</div>
          <Switch
            checked={trustDevice}
            onCheckedChange={setTrustDevice}
            className="data-[state=checked]:bg-[#1d3d35]"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid h-auto w-full grid-cols-3 rounded-2xl bg-stone-900/5 p-1">
          <TabsTrigger value="totp" className="rounded-2xl py-2.5">
            <Smartphone className="mr-2 h-4 w-4" />
            App
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-2xl py-2.5">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-2xl py-2.5">
            <KeyRound className="mr-2 h-4 w-4" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="totp">
          <div className="rounded-[28px] border border-stone-900/10 bg-white/60 px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Authenticator app
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div className="mt-5 flex justify-center">
              <OTPCodeInput value={totpCode} onChange={setTotpCode} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={verifyTotpMutation.isPending || totpCode.length !== 6}
                className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                onClick={() => verifyTotpMutation.mutate()}
              >
                {verifyTotpMutation.isPending ? 'Verifying...' : 'Verify code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-stone-900/15"
                disabled={sendOtpMutation.isPending}
                onClick={() => sendOtpMutation.mutate()}
              >
                {sendOtpMutation.isPending ? 'Sending...' : 'Send email code'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <div className="rounded-[28px] border border-stone-900/10 bg-white/60 px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Email code
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{emailHint}</p>
            <div className="mt-5 flex justify-center">
              <OTPCodeInput value={emailCode} onChange={setEmailCode} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={
                  verifyEmailOtpMutation.isPending || emailCode.length !== 6
                }
                className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                onClick={() => verifyEmailOtpMutation.mutate()}
              >
                {verifyEmailOtpMutation.isPending
                  ? 'Verifying...'
                  : 'Verify email code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-stone-900/15"
                disabled={sendOtpMutation.isPending}
                onClick={() => sendOtpMutation.mutate()}
              >
                {sendOtpMutation.isPending ? 'Sending...' : 'Send new code'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="rounded-[28px] border border-stone-900/10 bg-white/60 px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Backup code
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Use one of the single-use recovery codes you saved when 2FA was
              enabled.
            </p>
            <Input
              className="mt-5"
              value={backupCode}
              onChange={(event) => setBackupCode(event.target.value)}
              autoCapitalize="characters"
              placeholder="Enter a saved backup code"
            />
            <div className="mt-5">
              <Button
                type="button"
                disabled={
                  verifyBackupCodeMutation.isPending || backupCode.trim() === ''
                }
                className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                onClick={() => verifyBackupCodeMutation.mutate()}
              >
                {verifyBackupCodeMutation.isPending
                  ? 'Verifying...'
                  : 'Verify backup code'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
