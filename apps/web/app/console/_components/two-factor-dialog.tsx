'use client'

import { CopyButton } from '@repo/ui/components/ui/copy-button'
import { Button } from '@repo/ui/components/ui/button'
import { Dialog, DialogContent } from '@repo/ui/components/ui/dialog'
import { Input } from '@repo/ui/components/ui/input'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { OTPCodeInput } from '~/components/otp-code-input'
import { useAuthClient } from '~/hooks/useAuthClient'
import { getTotpSetupDetails } from '~/utils/totp'

interface TwoFactorButtonProps {
  className?: string
  hideTrigger?: boolean
  icon?: ReactNode
  label?: string
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  open?: boolean
}

type DialogStep =
  | 'initial'
  | 'setup-password'
  | 'setup-materials'
  | 'enabled'
  | 'regenerate-password'
  | 'regenerate-codes'
  | 'disable-confirm'

function BackupCodesPanel(props: {
  codes: string[]
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
        {props.codes.map((code) => (
          <div
            key={code}
            className="flex items-center justify-between rounded border bg-white px-3 py-2"
          >
            <span>{code}</span>
            <CopyButton value={code} className="h-8 w-8" />
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={props.acknowledged}
          onChange={(event) => props.onAcknowledgedChange(event.target.checked)}
          className="mt-1"
        />
        <span>
          I have stored these backup codes somewhere safe. Each code can only be
          used once.
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
  const [internalOpen, setInternalOpen] = useState(false)
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
  const isControlled = props.open !== undefined
  const isOpen = props.open ?? internalOpen

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open)
    }

    props.onOpenChange?.(open)

    if (!open) {
      props.onClose?.()
    }
  }

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
      {props.hideTrigger ? null : (
        <button
          className={props.className ?? 'mb-2 block w-full text-left'}
          onClick={() => setOpen(true)}
          type="button"
        >
          {props.icon}
          <span>{props.label ?? 'Two-factor Auth'}</span>
        </button>
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && preventDismiss) {
            return
          }

          setOpen(open)
          if (!open) {
            resetState()
          }
        }}
      >
        <DialogContent
          className="max-w-2xl p-6"
          showCloseButton={!preventDismiss}
        >
          {currentStep === 'initial' ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldOff className="h-5 w-5 text-gray-400" />
                <div className="text-lg font-semibold">
                  Two-Factor Authentication
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Add an extra layer of security to your account by requiring a
                verification code in addition to your password.
              </p>
              <Button
                onClick={() => setStep('setup-password')}
                className="w-full"
              >
                Enable 2FA
              </Button>
            </div>
          ) : null}

          {currentStep === 'setup-password' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                enableTwoFactorMutation.mutate()
              }}
            >
              <div className="text-lg font-semibold mb-4">
                Confirm your password
              </div>
              <div className="grid gap-4">
                <Input
                  value={setupPassword}
                  onChange={(event) => setSetupPassword(event.target.value)}
                  type="password"
                  placeholder="Password"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      enableTwoFactorMutation.isPending ||
                      setupPassword.trim().length === 0
                    }
                  >
                    {enableTwoFactorMutation.isPending
                      ? 'Loading...'
                      : 'Continue'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('initial')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </form>
          ) : null}

          {currentStep === 'setup-materials' ? (
            <div>
              <div className="text-lg font-semibold mb-4">
                Set up your authenticator
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-gray-200 p-4">
                  <div className="text-sm font-medium mb-3">Scan QR code</div>
                  <div className="flex justify-center">
                    {totpURI ? <QRCodeSVG value={totpURI} size={180} /> : null}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 p-4 space-y-4">
                  <div>
                    <div className="text-xs text-gray-500">Issuer</div>
                    <div>{setupDetails?.issuer ?? 'CSDR Cloud Spatial'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Account</div>
                    <div>
                      {setupDetails?.account ?? user?.email ?? 'Unavailable'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Secret</div>
                    <div className="mt-1 flex items-center justify-between rounded border bg-gray-50 px-3 py-2">
                      <code className="text-xs break-all">
                        {setupDetails?.secret ?? 'Unavailable'}
                      </code>
                      <CopyButton
                        value={setupDetails?.secret ?? ''}
                        className="h-8 w-8"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TOTP URI</div>
                    <div className="mt-1 flex items-center justify-between rounded border bg-gray-50 px-3 py-2">
                      <code className="text-xs break-all">
                        {totpURI ?? 'Unavailable'}
                      </code>
                      <CopyButton value={totpURI ?? ''} className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium mb-3">Backup codes</div>
                <BackupCodesPanel
                  codes={setupBackupCodes}
                  acknowledged={setupAcknowledged}
                  onAcknowledgedChange={setSetupAcknowledged}
                />
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium mb-3">Verify setup</div>
                <div className="flex justify-center mb-4">
                  <OTPCodeInput value={setupCode} onChange={setSetupCode} />
                </div>
                <Button
                  disabled={
                    verifyTwoFactorSetupMutation.isPending ||
                    setupCode.length !== 6 ||
                    !setupAcknowledged
                  }
                  onClick={() => verifyTwoFactorSetupMutation.mutate()}
                >
                  {verifyTwoFactorSetupMutation.isPending
                    ? 'Verifying...'
                    : 'Verify and enable'}
                </Button>
              </div>
            </div>
          ) : null}

          {currentStep === 'enabled' ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <div className="text-lg font-semibold">
                  Two-Factor Authentication
                </div>
              </div>
              <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  2FA is enabled
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('regenerate-password')}
                >
                  Regenerate backup codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setStep('disable-confirm')}
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : null}

          {currentStep === 'regenerate-password' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                regenerateBackupCodesMutation.mutate()
              }}
            >
              <div className="text-lg font-semibold mb-4">
                Regenerate backup codes
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Generating a new set invalidates every existing backup code.
              </p>
              <div className="grid gap-4">
                <Input
                  value={regeneratePassword}
                  onChange={(event) =>
                    setRegeneratePassword(event.target.value)
                  }
                  type="password"
                  placeholder="Password"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      regenerateBackupCodesMutation.isPending ||
                      regeneratePassword.trim().length === 0
                    }
                  >
                    {regenerateBackupCodesMutation.isPending
                      ? 'Loading...'
                      : 'Generate new codes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('enabled')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </form>
          ) : null}

          {currentStep === 'regenerate-codes' ? (
            <div>
              <div className="text-lg font-semibold mb-4">
                Save your new backup codes
              </div>
              <BackupCodesPanel
                codes={freshBackupCodes}
                acknowledged={backupAcknowledged}
                onAcknowledgedChange={setBackupAcknowledged}
              />
              <Button
                className="mt-6"
                disabled={!backupAcknowledged}
                onClick={() => {
                  setFreshBackupCodes([])
                  setBackupAcknowledged(false)
                  setStep('enabled')
                  toast.success('Backup codes refreshed')
                }}
              >
                Done
              </Button>
            </div>
          ) : null}

          {currentStep === 'disable-confirm' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                disableTwoFactorMutation.mutate()
              }}
            >
              <div className="text-lg font-semibold mb-4">Disable 2FA</div>
              <p className="text-sm text-gray-500 mb-4">
                Enter your password to disable two-factor authentication. This
                will remove the second-factor challenge from future sign-ins.
              </p>
              <div className="grid gap-4">
                <Input
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                  type="password"
                  placeholder="Password"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={
                      disableTwoFactorMutation.isPending ||
                      disablePassword.trim().length === 0
                    }
                  >
                    {disableTwoFactorMutation.isPending
                      ? 'Loading...'
                      : 'Disable 2FA'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('enabled')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
