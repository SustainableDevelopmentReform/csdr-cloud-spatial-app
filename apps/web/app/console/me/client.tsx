'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CopyButton } from '@repo/ui/components/ui/copy-button'
import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Switch } from '@repo/ui/components/ui/switch'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import {
  KeyRound,
  MailCheck,
  ShieldCheck,
  ShieldEllipsis,
  ShieldOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { OTPCodeInput } from '~/components/otp-code-input'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'
import { getTotpSetupDetails } from '~/utils/totp'

const profileSchema = z.object({
  name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
  image: z.string().url('Image URL must be valid').or(z.literal('')),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
    revokeOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

const displayFont =
  '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", serif'

function SectionCard(props: {
  badge: string
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[30px] border border-stone-900/10 bg-[linear-gradient(180deg,_rgba(255,250,244,0.98),_rgba(249,242,232,0.94))] shadow-[0_22px_70px_rgba(61,36,13,0.08)]">
      <div className="flex flex-col gap-5 border-b border-stone-900/10 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.36em] text-stone-500">
            {props.badge}
          </div>
          <h2
            className="mt-3 text-3xl leading-none text-stone-950"
            style={{ fontFamily: displayFont }}
          >
            {props.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {props.description}
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-stone-900/10 bg-white/70 text-stone-700">
          {props.icon}
        </div>
      </div>
      <div className="px-6 py-6">{props.children}</div>
    </section>
  )
}

function BackupCodesPanel(props: {
  codes: string[]
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
  caption: string
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

export default function ClientPage() {
  const authClient = useAuthClient()
  const router = useRouter()
  const { appUrl } = useConfig()
  const { data } = authClient.useSession()
  const user = data?.user

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [setupPassword, setSetupPassword] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [setupTotpURI, setSetupTotpURI] = useState<string | null>(null)
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([])
  const [setupAcknowledged, setSetupAcknowledged] = useState(false)

  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false)
  const [backupPassword, setBackupPassword] = useState('')
  const [freshBackupCodes, setFreshBackupCodes] = useState<string[]>([])
  const [backupAcknowledged, setBackupAcknowledged] = useState(false)

  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  const profileForm = useForm<ProfileData>({
    defaultValues: {
      name: '',
      image: '',
    },
    resolver: zodResolver(profileSchema),
  })

  const passwordForm = useForm<PasswordData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: true,
    },
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (!user) {
      return
    }

    profileForm.reset({
      name: user.name ?? '',
      image: user.image ?? '',
    })
  }, [profileForm, user])

  const refreshSession = async () => {
    await authClient.getSession()
    router.refresh()
  }

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        return
      }

      const res = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: `${appUrl}/login?emailVerified=1`,
      })

      if (res.error) {
        throw res.error
      }

      toast.success('Verification email sent')
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileData) => {
      const res = await authClient.updateUser({
        name: values.name,
        image: values.image || null,
      })

      if (res.error) {
        throw res.error
      }

      await refreshSession()
      toast.success('Profile updated')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordData) => {
      const res = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      })

      if (res.error) {
        throw res.error
      }

      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        revokeOtherSessions: values.revokeOtherSessions,
      })

      await refreshSession()
      toast.success('Password changed')
    },
  })

  const enableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.enable({
        password: setupPassword,
        issuer: 'CSDR Cloud Spatial',
      })

      if (res.error) {
        throw res.error
      }

      setSetupTotpURI(res.data?.totpURI ?? null)
      setSetupBackupCodes(res.data?.backupCodes ?? [])
      setSetupAcknowledged(false)
      setSetupCode('')
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
      setIsSetupOpen(false)
      setSetupPassword('')
      setSetupCode('')
      setSetupTotpURI(null)
      setSetupBackupCodes([])
      setSetupAcknowledged(false)
    },
  })

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.twoFactor.generateBackupCodes({
        password: backupPassword,
      })

      if (res.error) {
        throw res.error
      }

      setFreshBackupCodes(res.data?.backupCodes ?? [])
      setBackupAcknowledged(false)
      setBackupPassword('')
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
      setDisablePassword('')
      setIsDisableDialogOpen(false)
    },
  })

  const setupDetails = useMemo(
    () => (setupTotpURI ? getTotpSetupDetails(setupTotpURI) : null),
    [setupTotpURI],
  )

  if (!user) {
    return (
      <div className="grid gap-6">
        <div className="h-52 animate-pulse rounded-[30px] border border-stone-900/10 bg-stone-100" />
        <div className="h-72 animate-pulse rounded-[30px] border border-stone-900/10 bg-stone-100" />
      </div>
    )
  }

  const isShowingSetupMaterials = !!setupTotpURI && setupBackupCodes.length > 0

  const preventSetupDismiss = isShowingSetupMaterials && !setupAcknowledged
  const preventBackupDismiss =
    freshBackupCodes.length > 0 && !backupAcknowledged

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-stone-900/10 bg-[linear-gradient(135deg,_rgba(255,248,240,0.98),_rgba(232,223,207,0.92))] px-6 py-7 shadow-[0_24px_80px_rgba(61,36,13,0.08)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(157,60,23,0.18),_transparent_55%)]" />
        <div className="absolute bottom-[-18px] left-[-18px] h-24 w-24 rounded-full border border-stone-900/10" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-stone-500">
              Me
            </div>
            <h1
              className="mt-3 text-5xl leading-[0.95] text-stone-950"
              style={{ fontFamily: displayFont }}
            >
              Keep your account recovery-ready.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-700">
              Profile details, password hygiene, verification, and two-factor
              controls live together here so the account boundary stays easy to
              inspect and hard to neglect.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[28px] border border-stone-900/10 bg-white/65 px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
                Email
              </div>
              <div className="mt-2 text-base font-semibold text-stone-900">
                {user.email}
              </div>
              <div className="mt-2 text-sm text-stone-600">
                {user.emailVerified ? 'Verified' : 'Verification pending'}
              </div>
            </div>
            <div className="rounded-[28px] border border-stone-900/10 bg-[#1d3d35] px-5 py-5 text-stone-100">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-300">
                Two-factor
              </div>
              <div className="mt-2 text-base font-semibold">
                {user.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
              </div>
              <div className="mt-2 text-sm text-stone-300">
                TOTP setup with email OTP and backup codes available at sign-in.
              </div>
            </div>
          </div>
        </div>
      </section>

      {!user.emailVerified ? (
        <SectionCard
          badge="Verification"
          title="Email confirmation is still pending"
          description="Some environments require email verification before a credential sign-in can complete. Send a fresh verification link if you need another copy."
          icon={<MailCheck className="h-6 w-6" />}
        >
          <Button
            disabled={resendVerificationMutation.isPending}
            className="rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
            onClick={() => resendVerificationMutation.mutate()}
          >
            {resendVerificationMutation.isPending
              ? 'Sending...'
              : 'Resend verification email'}
          </Button>
        </SectionCard>
      ) : null}

      <SectionCard
        badge="Profile"
        title="Profile details"
        description="Keep the account identity clean and recognizable for the rest of the team."
        icon={<ShieldEllipsis className="h-6 w-6" />}
      >
        <Form {...profileForm}>
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={profileForm.handleSubmit((values) =>
              updateProfileMutation.mutate(values),
            )}
          >
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input disabled value={user.email} className="bg-stone-100" />
            </FormItem>
            <FormField
              control={profileForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={profileForm.control}
              name="image"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Profile image URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Optional image URL"
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="lg:col-span-2">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
              >
                {updateProfileMutation.isPending
                  ? 'Saving...'
                  : 'Save profile changes'}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>

      <SectionCard
        badge="Password"
        title="Password change"
        description="Use your current password to set a new one. You can also revoke other sessions during the change."
        icon={<KeyRound className="h-6 w-6" />}
      >
        <Form {...passwordForm}>
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={passwordForm.handleSubmit((values) =>
              changePasswordMutation.mutate(values),
            )}
          >
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="hidden lg:block" />
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="revokeOtherSessions"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <div className="flex items-center justify-between rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-4">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">
                        Revoke other sessions
                      </div>
                      <div className="mt-1 text-sm leading-6 text-stone-600">
                        Recommended when you are rotating the password after a
                        security concern.
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#1d3d35]"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <div className="lg:col-span-2">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
              >
                {changePasswordMutation.isPending
                  ? 'Updating...'
                  : 'Change password'}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>

      <SectionCard
        badge="Two-factor"
        title={
          user.twoFactorEnabled
            ? 'Two-factor protection is active'
            : 'Add a second factor to this account'
        }
        description={
          user.twoFactorEnabled
            ? 'Authenticator codes, email OTP, and backup codes are available during sign-in. Trusted devices can skip prompts for 30 days.'
            : 'Start with a TOTP setup, then keep backup codes somewhere safe. Email OTP remains available during sign-in challenges.'
        }
        icon={
          user.twoFactorEnabled ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <ShieldOff className="h-6 w-6" />
          )
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[26px] border border-stone-900/10 bg-white/65 px-5 py-5">
            <div className="text-sm font-semibold text-stone-900">
              Sign-in methods
            </div>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-600">
              <li>
                Authenticator app codes for primary second-factor prompts.
              </li>
              <li>
                Email OTP as an alternate challenge on the sign-in screen.
              </li>
              <li>
                Single-use backup codes for recovery when devices are
                unavailable.
              </li>
              <li>Trusted devices remembered for 30 days when selected.</li>
            </ul>
          </div>

          <div className="rounded-[26px] border border-stone-900/10 bg-[#fcf7ef] px-5 py-5">
            <div className="text-sm font-semibold text-stone-900">Status</div>
            <div className="mt-3 inline-flex rounded-full border border-stone-900/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
              {user.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
            </div>

            <div className="mt-5 grid gap-3">
              {!user.twoFactorEnabled ? (
                <Button
                  className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                  onClick={() => setIsSetupOpen(true)}
                >
                  Set up 2FA
                </Button>
              ) : (
                <>
                  <Button
                    className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    onClick={() => setIsBackupDialogOpen(true)}
                  >
                    Regenerate backup codes
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#9d3c17]/25 text-[#7d2f11] hover:bg-[#9d3c17]/8 hover:text-[#7d2f11]"
                    onClick={() => setIsDisableDialogOpen(true)}
                  >
                    Disable 2FA
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <Dialog
        open={isSetupOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && preventSetupDismiss) {
            return
          }

          setIsSetupOpen(nextOpen)

          if (!nextOpen) {
            setSetupPassword('')
            setSetupCode('')
            setSetupTotpURI(null)
            setSetupBackupCodes([])
            setSetupAcknowledged(false)
          }
        }}
      >
        <DialogContent
          className="w-full max-w-3xl rounded-[30px] border border-stone-900/10 bg-[#fffaf4] p-0"
          showCloseButton={!preventSetupDismiss}
        >
          <div className="border-b border-stone-900/10 px-6 py-6">
            <DialogHeader>
              <DialogTitle
                className="text-3xl text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                {isShowingSetupMaterials
                  ? 'Verify your authenticator app'
                  : 'Start two-factor setup'}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
                {isShowingSetupMaterials
                  ? 'Store the backup codes now, then verify one authenticator code to finish enabling 2FA.'
                  : 'Enter your password to generate a TOTP secret and fresh backup codes for this account.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-6">
            {!isShowingSetupMaterials ? (
              <div className="grid gap-4">
                <FormItem>
                  <Label>Password</Label>
                  <Input
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                    type="password"
                    placeholder="Confirm your password"
                  />
                </FormItem>
                <Button
                  disabled={
                    enableTwoFactorMutation.isPending ||
                    setupPassword.length === 0
                  }
                  className="w-fit rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                  onClick={() => enableTwoFactorMutation.mutate()}
                >
                  {enableTwoFactorMutation.isPending
                    ? 'Preparing...'
                    : 'Generate setup materials'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Authenticator QR
                    </div>
                    <div className="mt-4 flex justify-center rounded-[24px] border border-stone-900/10 bg-[#fcf7ef] p-4">
                      {setupTotpURI ? (
                        <QRCodeSVG value={setupTotpURI} size={192} />
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Manual authenticator setup
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
                          {setupDetails?.account ?? user.email}
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
                          Full TOTP URI
                        </div>
                        <div className="mt-2 flex items-start justify-between gap-4 rounded-2xl border border-stone-900/10 bg-[#fcf7ef] px-4 py-4">
                          <code className="break-all text-xs leading-6 text-stone-700">
                            {setupTotpURI}
                          </code>
                          <CopyButton
                            value={setupTotpURI ?? ''}
                            className="h-8 w-8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <BackupCodesPanel
                  codes={setupBackupCodes}
                  acknowledged={setupAcknowledged}
                  onAcknowledgedChange={setSetupAcknowledged}
                  caption="These recovery codes replace any older set. Save them before you verify the authenticator step."
                />

                <div className="rounded-[26px] border border-stone-900/10 bg-white/70 p-5">
                  <div className="text-sm font-semibold text-stone-900">
                    Verification code
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Enter one authenticator code to finish turning two-factor
                    protection on for this account.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <OTPCodeInput value={setupCode} onChange={setSetupCode} />
                  </div>
                  <Button
                    disabled={
                      verifyTwoFactorSetupMutation.isPending ||
                      setupCode.length !== 6 ||
                      !setupAcknowledged
                    }
                    className="mt-5 rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    onClick={() => verifyTwoFactorSetupMutation.mutate()}
                  >
                    {verifyTwoFactorSetupMutation.isPending
                      ? 'Enabling...'
                      : 'Verify and enable 2FA'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBackupDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && preventBackupDismiss) {
            return
          }

          setIsBackupDialogOpen(nextOpen)

          if (!nextOpen) {
            setBackupPassword('')
            setFreshBackupCodes([])
            setBackupAcknowledged(false)
          }
        }}
      >
        <DialogContent
          className="w-full max-w-3xl rounded-[30px] border border-stone-900/10 bg-[#fffaf4] p-0"
          showCloseButton={!preventBackupDismiss}
        >
          <div className="border-b border-stone-900/10 px-6 py-6">
            <DialogHeader>
              <DialogTitle
                className="text-3xl text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                {freshBackupCodes.length > 0
                  ? 'Store the replacement codes'
                  : 'Regenerate backup codes'}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
                {freshBackupCodes.length > 0
                  ? 'The older recovery codes are now invalid. Save this new set before leaving this dialog.'
                  : 'Enter your password to rotate the recovery codes for this account.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-6">
            {freshBackupCodes.length === 0 ? (
              <div className="grid gap-4">
                <FormItem>
                  <Label>Password</Label>
                  <Input
                    value={backupPassword}
                    onChange={(event) => setBackupPassword(event.target.value)}
                    type="password"
                    placeholder="Confirm your password"
                  />
                </FormItem>
                <Button
                  disabled={
                    regenerateBackupCodesMutation.isPending ||
                    backupPassword.length === 0
                  }
                  className="w-fit rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
                  onClick={() => regenerateBackupCodesMutation.mutate()}
                >
                  {regenerateBackupCodesMutation.isPending
                    ? 'Regenerating...'
                    : 'Replace backup codes'}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <BackupCodesPanel
                  codes={freshBackupCodes}
                  acknowledged={backupAcknowledged}
                  onAcknowledgedChange={setBackupAcknowledged}
                  caption="These are the only valid recovery codes going forward."
                />
                <Button
                  disabled={!backupAcknowledged}
                  className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                  onClick={() => {
                    setIsBackupDialogOpen(false)
                    setFreshBackupCodes([])
                    setBackupAcknowledged(false)
                    toast.success('Backup codes rotated')
                  }}
                >
                  I've stored these codes
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDisableDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsDisableDialogOpen(nextOpen)
          if (!nextOpen) {
            setDisablePassword('')
          }
        }}
      >
        <DialogContent className="w-full max-w-xl rounded-[30px] border border-stone-900/10 bg-[#fffaf4] p-0">
          <div className="border-b border-stone-900/10 px-6 py-6">
            <DialogHeader>
              <DialogTitle
                className="text-3xl text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                Disable two-factor protection
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
                Password confirmation is required. Future sign-ins will stop
                prompting for a second factor on this account.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-6">
            <FormItem>
              <Label>Password</Label>
              <Input
                value={disablePassword}
                onChange={(event) => setDisablePassword(event.target.value)}
                type="password"
                placeholder="Confirm your password"
              />
            </FormItem>
            <Button
              disabled={
                disableTwoFactorMutation.isPending ||
                disablePassword.length === 0
              }
              className="mt-5 rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
              onClick={() => disableTwoFactorMutation.mutate()}
            >
              {disableTwoFactorMutation.isPending
                ? 'Disabling...'
                : 'Disable 2FA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
