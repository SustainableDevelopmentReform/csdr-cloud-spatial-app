'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Switch } from '@repo/ui/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthShell } from '~/components/auth-shell'
import Link from '~/components/link'
import { OTPCodeInput } from '~/components/otp-code-input'
import { useAuthClient } from '~/hooks/useAuthClient'

const backupCodeSchema = z.object({
  code: z.string().min(6, 'Backup code is required'),
})

type BackupCodeData = z.infer<typeof backupCodeSchema>

export default function LoginTwoFactorPage() {
  const authClient = useAuthClient()
  const router = useRouter()
  const [tab, setTab] = useState('totp')
  const [totpCode, setTotpCode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [emailOtpSent, setEmailOtpSent] = useState(false)

  const backupCodeForm = useForm<BackupCodeData>({
    defaultValues: {
      code: '',
    },
    resolver: zodResolver(backupCodeSchema),
  })

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.sendOtp()

      if (res.error) {
        throw res.error
      }

      setEmailOtpSent(true)
      setTab('email')
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

      router.push('/')
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

      router.push('/')
    },
  })

  const verifyBackupCodeMutation = useMutation({
    mutationFn: async (data: BackupCodeData) => {
      const res = await authClient.twoFactor.verifyBackupCode({
        code: data.code,
        trustDevice,
      })

      if (res.error) {
        throw res.error
      }

      router.push('/')
    },
  })

  const emailHint = useMemo(() => {
    if (!emailOtpSent) {
      return 'Need an email code instead? Request one and we will switch you to the email challenge.'
    }

    return 'A fresh email code has been issued for this sign-in challenge.'
  }, [emailOtpSent])

  return (
    <AuthShell
      eyebrow="Two-factor verification"
      title="Finish signing in"
      description="Choose the second-factor method that is available to you for this account."
      footer={
        <>
          Need to start over?{' '}
          <Link href="/login" className="font-semibold text-[#9d3c17]">
            Return to sign in
          </Link>
        </>
      }
      panelClassName="max-w-2xl"
    >
      <div className="mb-5 rounded-[28px] border border-stone-900/10 bg-white/60 px-5 py-4">
        <div className="text-sm font-semibold text-stone-900">
          Trust this device
        </div>
        <div className="mt-1 text-sm leading-6 text-stone-600">
          Skip another two-factor prompt on this device for the next 30 days.
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
            Authenticator
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-2xl py-2.5">
            Email code
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-2xl py-2.5">
            Backup code
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
              Email verification code
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{emailHint}</p>
            <div className="mt-5 flex justify-center">
              <OTPCodeInput value={emailCode} onChange={setEmailCode} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
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
              Use one of the one-time recovery codes you saved when 2FA was
              enabled.
            </p>
            <Form {...backupCodeForm}>
              <form
                className="mt-5 grid gap-4"
                onSubmit={backupCodeForm.handleSubmit((data) =>
                  verifyBackupCodeMutation.mutate(data),
                )}
              >
                <FormField
                  control={backupCodeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoCapitalize="characters"
                          placeholder="Enter a saved backup code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={verifyBackupCodeMutation.isPending}
                  className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                >
                  {verifyBackupCodeMutation.isPending
                    ? 'Verifying...'
                    : 'Verify backup code'}
                </Button>
              </form>
            </Form>
          </div>
        </TabsContent>
      </Tabs>
    </AuthShell>
  )
}
