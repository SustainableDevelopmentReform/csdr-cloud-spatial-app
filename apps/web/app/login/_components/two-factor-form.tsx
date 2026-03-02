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
      <div className="mb-4">
        <div>
          <div className="font-bold text-2xl mb-2">Two-factor verification</div>
          <p className="text-sm text-gray-500 mb-4">
            Choose the second-factor method that is available to you for this
            account.
          </p>
        </div>
      </div>
      {props.onCancel ? (
        <button
          className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700"
          onClick={props.onCancel}
        >
          Back to login
        </button>
      ) : (
        <Link href="/login" className="text-sm text-blue-500 mb-4 inline-block">
          Back to login
        </Link>
      )}

      <div className="mb-4 rounded-md border border-gray-200 bg-white p-4">
        <div className="text-sm font-medium">Trust this device</div>
        <div className="mt-1 text-sm text-gray-500">
          Skip another two-factor prompt on this browser for the next 30 days.
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="text-sm">Remember this browser</div>
          <Switch checked={trustDevice} onCheckedChange={setTrustDevice} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="totp">
            <Smartphone className="mr-2 h-4 w-4" />
            App
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="backup">
            <KeyRound className="mr-2 h-4 w-4" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="totp" className="mt-4">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div className="flex justify-center mb-4">
              <OTPCodeInput value={totpCode} onChange={setTotpCode} />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={verifyTotpMutation.isPending || totpCode.length !== 6}
                onClick={() => verifyTotpMutation.mutate()}
              >
                {verifyTotpMutation.isPending ? 'Verifying...' : 'Verify code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={sendOtpMutation.isPending}
                onClick={() => sendOtpMutation.mutate()}
              >
                {sendOtpMutation.isPending ? 'Sending...' : 'Send email code'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <div>
            <p className="text-sm text-gray-500 mb-4">{emailHint}</p>
            <div className="flex justify-center mb-4">
              <OTPCodeInput value={emailCode} onChange={setEmailCode} />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={
                  verifyEmailOtpMutation.isPending || emailCode.length !== 6
                }
                onClick={() => verifyEmailOtpMutation.mutate()}
              >
                {verifyEmailOtpMutation.isPending
                  ? 'Verifying...'
                  : 'Verify email code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={sendOtpMutation.isPending}
                onClick={() => sendOtpMutation.mutate()}
              >
                {sendOtpMutation.isPending ? 'Sending...' : 'Send new code'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Use one of the single-use recovery codes you saved when 2FA was
              enabled.
            </p>
            <Input
              value={backupCode}
              onChange={(event) => setBackupCode(event.target.value)}
              autoCapitalize="characters"
              placeholder="Enter a saved backup code"
              className="mb-4"
            />
            <div>
              <Button
                type="button"
                disabled={
                  verifyBackupCodeMutation.isPending || backupCode.trim() === ''
                }
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
