'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { Switch } from '@repo/ui/components/ui/switch'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation } from '@tanstack/react-query'
import { MailCheck, ShieldEllipsis } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'

interface AccountSettingsProps {
  onClose?: () => void
}

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
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-stone-900/10 bg-white/70 px-5 py-5">
      <div className="text-lg font-semibold text-stone-950">{props.title}</div>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {props.description}
      </p>
      <div className="mt-5">{props.children}</div>
    </section>
  )
}

const AccountSettingsButton = ({ onClose }: AccountSettingsProps) => {
  const authClient = useAuthClient()
  const router = useRouter()
  const { appUrl } = useConfig()
  const { data } = authClient.useSession()
  const user = data?.user
  const [isOpen, setOpen] = useState(false)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      image: '',
    },
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: true,
    },
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

  const handleUpdateProfile = useMutation({
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

  return (
    <>
      <button
        className="mb-2 block w-full text-left"
        onClick={() => setOpen(true)}
      >
        Account details
      </button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setOpen(open)
          if (!open) {
            onClose?.()
          }
        }}
      >
        <DialogContent className="w-full max-w-3xl rounded-[30px] border border-stone-900/10 bg-[#fffaf4] p-0">
          <div className="border-b border-stone-900/10 px-6 py-6">
            <DialogHeader>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                Account
              </div>
              <DialogTitle
                className="mt-3 text-3xl text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                Keep your account details tidy.
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
                Profile, verification, and password controls stay close to the
                user menu so they can be updated without leaving the current
                screen.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-5 px-6 py-6">
            {!user?.emailVerified ? (
              <section className="rounded-[28px] border border-[#9d3c17]/15 bg-[#9d3c17]/6 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#7d2f11]">
                      <MailCheck className="h-4 w-4" />
                      Verification pending
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      Some environments require a verified email before another
                      credential sign-in can complete.
                    </p>
                  </div>
                  <Button
                    type="button"
                    disabled={resendVerificationMutation.isPending}
                    className="rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
                    onClick={() => resendVerificationMutation.mutate()}
                  >
                    {resendVerificationMutation.isPending
                      ? 'Sending...'
                      : 'Resend email'}
                  </Button>
                </div>
              </section>
            ) : null}

            <SectionCard
              title="Profile details"
              description="Keep the account identity recognizable for you and the rest of the team."
            >
              <Form {...profileForm}>
                <form
                  className="grid gap-4 lg:grid-cols-2"
                  onSubmit={profileForm.handleSubmit((values) =>
                    handleUpdateProfile.mutate(values),
                  )}
                >
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input
                      disabled
                      value={user?.email ?? ''}
                      className="bg-stone-100"
                    />
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
                      disabled={handleUpdateProfile.isPending}
                      className="rounded-full bg-[#1d3d35] text-white hover:bg-[#173129]"
                    >
                      {handleUpdateProfile.isPending
                        ? 'Saving...'
                        : 'Save profile changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </SectionCard>

            <SectionCard
              title="Password change"
              description="Use your current password to set a new one, and revoke other sessions when you need a clean reset."
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
                        <div className="flex items-center justify-between rounded-2xl border border-stone-900/10 bg-[#fcf7ef] px-4 py-4">
                          <div>
                            <div className="text-sm font-semibold text-stone-900">
                              Revoke other sessions
                            </div>
                            <div className="mt-1 text-sm leading-6 text-stone-600">
                              Recommended when you are rotating the password
                              after a security concern.
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
          </div>

          <div className="border-t border-stone-900/10 bg-white/40 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <ShieldEllipsis className="h-4 w-4" />
              Access changes are applied to your live session immediately.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AccountSettingsButton
