'use client'

import { CopyButton } from '@repo/ui/components/ui/copy-button'
import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog'
import { Input } from '@repo/ui/components/ui/input'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { OTPCodeInput } from '~/components/otp-code-input'
import { useAuthClient } from '~/hooks/useAuthClient'
import { getTotpSetupDetails } from '~/utils/totp'

interface TwoFactorButtonProps {
  onClose?: () => void
}

type DialogStep =
  | 'initial'
  | 'setup-password'
  | 'setup-materials'
  | 'enabled'
  | 'regenerate-password'
  | 'regenerate-codes'
  | 'disable-confirm'

const displayFont =
  '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", serif'

function BackupCodesPanel(props: {
  caption: string
  codes: string[]
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-[#9d3c17]/15 bg-[#9d3c17]/6 p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7d2f11]">
          Backup codes
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">{props.caption}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {props.codes.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3"
            >
              <span className="font-mono text-sm tracking-[0.18em] text-stone-800">
                {code}
              </span>
              <CopyButton value={code} className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-stone-900/10 bg-white/65 px-4 py-4 text-sm leading-6 text-stone-700">
        <input
          type="checkbox"
          checked={props.acknowledged}
          onChange={(event) => props.onAcknowledgedChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-stone-400 text-[#1d3d35] focus:ring-[#1d3d35]"
        />
        <span>
          I have stored these backup codes somewhere safe. I understand each one
          can only be used once.
        </span>
      </label>
    </div>
  )
}

export default function TwoFactorButton(props: TwoFactorButtonProps) {
  const authClient = useAuthClient()
  const router = useRouter()
  const { data } = authClient.useSession()
  const user = data?.user
  const [isOpen, setOpen] = useState(false)
  const [step, setStep] = useState<DialogStep>('initial')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [totpURI, setTotpURI] = useState<string | null>(null)
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([])
  const [setupAcknowledged, setSetupAcknowledged] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState('')
  const [freshBackupCodes, setFreshBackupCodes] = useState<string[]>([])
  const [backupAcknowledged, setBackupAcknowledged] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  const refreshSession = async () => {
    await authClient.getSession()
    router.refresh()
  }

  const resetState = () => {
    setStep('initial')
    setSetupPassword('')
    setSetupCode('')
    setTotpURI(null)
    setSetupBackupCodes([])
    setSetupAcknowledged(false)
    setRegeneratePassword('')
    setFreshBackupCodes([])
    setBackupAcknowledged(false)
    setDisablePassword('')
  }

  const enableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.enable({
        password: setupPassword,
        issuer: 'CSDR Cloud Spatial',
      })

      if (res.error) {
        throw res.error
      }

      setTotpURI(res.data?.totpURI ?? null)
      setSetupBackupCodes(res.data?.backupCodes ?? [])
      setSetupAcknowledged(false)
      setStep('setup-materials')
    },
    onError(error) {
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    },
  })

  const verifyTwoFactorSetupMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.verifyTotp({
        code: setupCode,
        trustDevice: false,
      })

      if (res.error) {
        throw res.error
      }

      toast.success('Two-factor protection enabled')
      await refreshSession()
      resetState()
      setOpen(false)
      props.onClose?.()
    },
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : 'Verification failed',
      )
    },
  })

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.generateBackupCodes({
        password: regeneratePassword,
      })

      if (res.error) {
        throw res.error
      }

      setFreshBackupCodes(res.data?.backupCodes ?? [])
      setBackupAcknowledged(false)
      setRegeneratePassword('')
      setStep('regenerate-codes')
    },
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to regenerate codes',
      )
    },
  })

  const disableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.disable({
        password: disablePassword,
      })

      if (res.error) {
        throw res.error
      }

      toast.success('Two-factor protection disabled')
      await refreshSession()
      resetState()
      setOpen(false)
      props.onClose?.()
    },
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to disable 2FA',
      )
    },
  })

  const setupDetails = useMemo(
    () => (totpURI ? getTotpSetupDetails(totpURI) : null),
    [totpURI],
  )

  const preventDismiss =
    (step === 'setup-materials' &&
      setupBackupCodes.length > 0 &&
      !setupAcknowledged) ||
    (step === 'regenerate-codes' &&
      freshBackupCodes.length > 0 &&
      !backupAcknowledged)

  const currentStep =
    step === 'initial' ? (user?.twoFactorEnabled ? 'enabled' : 'initial') : step

  return (
    <>
      <button
        className="mb-2 block w-full text-left"
        onClick={() => setOpen(true)}
      >
        Two-factor auth
      </button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && preventDismiss) {
            return
          }

          setOpen(open)
          if (!open) {
            resetState()
            props.onClose?.()
          }
        }}
      >
        <DialogContent
          className="w-full max-w-3xl rounded-[30px] border border-stone-900/10 bg-[#fffaf4] p-0"
          showCloseButton={!preventDismiss}
        >
          <div className="border-b border-stone-900/10 px-6 py-6">
            <DialogHeader>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                Two-factor
              </div>
              <DialogTitle
                className="mt-3 text-3xl text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                {currentStep === 'enabled'
                  ? 'Second-factor coverage is active.'
                  : currentStep === 'setup-materials'
                    ? 'Scan the QR code and store your recovery set.'
                    : currentStep === 'regenerate-codes'
                      ? 'Store the replacement recovery set.'
                      : 'Protect the account with another factor.'}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
                TOTP setup is the enrollment step. Email OTP and backup codes
                remain available during sign-in challenges.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-6">
            {currentStep === 'initial' ? (
              <div className="grid gap-5">
                <div className="rounded-[28px] border border-stone-900/10 bg-white/70 px-5 py-5">
                  <div className="flex items-center gap-3 text-stone-900">
                    <ShieldOff className="h-5 w-5" />
                    <div className="text-lg font-semibold">
                      Two-factor is not enabled yet
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Add an authenticator app as the primary second factor, then
                    keep the generated backup codes somewhere safe.
                  </p>
                </div>
                <Button
                  className="w-fit rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                  onClick={() => setStep('setup-password')}
                >
                  Set up 2FA
                </Button>
              </div>
            ) : null}

            {currentStep === 'setup-password' ? (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-900">
                    Password
                  </span>
                  <Input
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                    type="password"
                    placeholder="Confirm your password"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      enableTwoFactorMutation.isPending ||
                      setupPassword.trim().length === 0
                    }
                    className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    onClick={() => enableTwoFactorMutation.mutate()}
                  >
                    {enableTwoFactorMutation.isPending
                      ? 'Preparing...'
                      : 'Generate setup materials'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-stone-900/15"
                    onClick={() => setStep('initial')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : null}

            {currentStep === 'setup-materials' ? (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Authenticator QR
                    </div>
                    <div className="mt-4 flex justify-center rounded-[24px] border border-stone-900/10 bg-[#fcf7ef] p-4">
                      {totpURI ? (
                        <QRCodeSVG value={totpURI} size={192} />
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Manual setup
                    </div>
                    <div className="mt-4 space-y-4 text-sm text-stone-700">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Issuer
                        </div>
                        <div className="mt-1 font-medium text-stone-900">
                          {setupDetails?.issuer ?? 'CSDR Cloud Spatial'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Account label
                        </div>
                        <div className="mt-1 font-medium text-stone-900">
                          {setupDetails?.account ??
                            user?.email ??
                            'Unavailable'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Secret
                        </div>
                        <div className="mt-2 flex items-center justify-between rounded-2xl border border-stone-900/10 bg-[#fcf7ef] px-4 py-3">
                          <span className="font-mono text-sm tracking-[0.18em] text-stone-900">
                            {setupDetails?.secret ?? 'Unavailable'}
                          </span>
                          <CopyButton
                            value={setupDetails?.secret ?? ''}
                            className="h-8 w-8"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          TOTP URI
                        </div>
                        <div className="mt-2 flex items-center justify-between rounded-2xl border border-stone-900/10 bg-[#fcf7ef] px-4 py-3">
                          <span className="truncate font-mono text-xs text-stone-900">
                            {totpURI ?? 'Unavailable'}
                          </span>
                          <CopyButton
                            value={totpURI ?? ''}
                            className="h-8 w-8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <BackupCodesPanel
                  caption="Store these backup codes before you finish setup. Each code works once."
                  codes={setupBackupCodes}
                  acknowledged={setupAcknowledged}
                  onAcknowledgedChange={setSetupAcknowledged}
                />

                <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Verify setup
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Scan the QR code in your authenticator app, then enter a
                    6-digit code to finish enabling 2FA.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <OTPCodeInput value={setupCode} onChange={setSetupCode} />
                  </div>
                  <div className="mt-5">
                    <Button
                      disabled={
                        verifyTwoFactorSetupMutation.isPending ||
                        setupCode.length !== 6 ||
                        !setupAcknowledged
                      }
                      className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                      onClick={() => verifyTwoFactorSetupMutation.mutate()}
                    >
                      {verifyTwoFactorSetupMutation.isPending
                        ? 'Verifying...'
                        : 'Verify and enable'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 'enabled' ? (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-stone-900/10 bg-white/70 px-5 py-5">
                  <div className="flex items-center gap-3 text-stone-900">
                    <ShieldCheck className="h-5 w-5" />
                    <div className="text-lg font-semibold">
                      Two-factor is active
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-600">
                    <li>
                      Authenticator app codes remain the primary challenge.
                    </li>
                    <li>
                      Email OTP is available on the sign-in screen when needed.
                    </li>
                    <li>
                      Backup codes cover recovery when devices are unavailable.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    onClick={() => setStep('regenerate-password')}
                  >
                    Regenerate backup codes
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#9d3c17]/25 text-[#7d2f11] hover:bg-[#9d3c17]/8 hover:text-[#7d2f11]"
                    onClick={() => setStep('disable-confirm')}
                  >
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : null}

            {currentStep === 'regenerate-password' ? (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-900">
                    Password
                  </span>
                  <Input
                    value={regeneratePassword}
                    onChange={(event) =>
                      setRegeneratePassword(event.target.value)
                    }
                    type="password"
                    placeholder="Confirm your password"
                  />
                </label>
                <div className="rounded-[24px] border border-[#9d3c17]/15 bg-[#9d3c17]/6 px-4 py-4 text-sm leading-6 text-stone-600">
                  Generating a new set invalidates every existing backup code.
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      regenerateBackupCodesMutation.isPending ||
                      regeneratePassword.trim().length === 0
                    }
                    className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    onClick={() => regenerateBackupCodesMutation.mutate()}
                  >
                    {regenerateBackupCodesMutation.isPending
                      ? 'Regenerating...'
                      : 'Generate new codes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-stone-900/15"
                    onClick={() => setStep('enabled')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : null}

            {currentStep === 'regenerate-codes' ? (
              <div className="space-y-5">
                <BackupCodesPanel
                  caption="These replacement codes are the only valid recovery set now."
                  codes={freshBackupCodes}
                  acknowledged={backupAcknowledged}
                  onAcknowledgedChange={setBackupAcknowledged}
                />
                <Button
                  disabled={!backupAcknowledged}
                  className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                  onClick={() => {
                    toast.success('Backup codes refreshed')
                    setStep('enabled')
                    setFreshBackupCodes([])
                    setBackupAcknowledged(false)
                  }}
                >
                  Done
                </Button>
              </div>
            ) : null}

            {currentStep === 'disable-confirm' ? (
              <div className="grid gap-4">
                <div className="rounded-[24px] border border-[#9d3c17]/15 bg-[#9d3c17]/6 px-4 py-4 text-sm leading-6 text-stone-600">
                  Disabling two-factor removes the extra verification step from
                  future credential sign-ins on this account.
                </div>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-900">
                    Password
                  </span>
                  <Input
                    value={disablePassword}
                    onChange={(event) => setDisablePassword(event.target.value)}
                    type="password"
                    placeholder="Confirm your password"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      disableTwoFactorMutation.isPending ||
                      disablePassword.trim().length === 0
                    }
                    variant="outline"
                    className="rounded-full border-[#9d3c17]/25 text-[#7d2f11] hover:bg-[#9d3c17]/8 hover:text-[#7d2f11]"
                    onClick={() => disableTwoFactorMutation.mutate()}
                  >
                    {disableTwoFactorMutation.isPending
                      ? 'Disabling...'
                      : 'Disable 2FA'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-stone-900/15"
                    onClick={() => setStep('enabled')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-stone-900/10 bg-white/40 px-6 py-4 text-sm text-stone-600">
            Trusted devices are selected during sign-in and remain valid for 30
            days.
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
