'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/ui/button'
import { Dialog, DialogContent } from '@repo/ui/components/ui/dialog'
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
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'

interface AccountSettingsProps {
  className?: string
  hideTrigger?: boolean
  icon?: ReactNode
  label?: string
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  open?: boolean
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

const AccountSettingsButton = ({
  className,
  hideTrigger = false,
  icon,
  label = 'Account Details',
  onOpenChange,
  onClose,
  open: openProp,
}: AccountSettingsProps) => {
  const authClient = useAuthClient()
  const router = useRouter()
  const { appUrl } = useConfig()
  const { data } = authClient.useSession()
  const user = data?.user
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const isOpen = openProp ?? internalOpen

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open)
    }

    onOpenChange?.(open)

    if (!open) {
      onClose?.()
    }
  }

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
    onError(error) {
      toast.error(error instanceof Error ? error.message : 'Update failed')
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
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : 'Password change failed',
      )
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
    onError(error) {
      toast.error(error instanceof Error ? error.message : 'Resend failed')
    },
  })

  return (
    <>
      {hideTrigger ? null : (
        <button
          className={className ?? 'mb-2 block w-full text-left'}
          onClick={() => setOpen(true)}
          type="button"
        >
          {icon}
          <span>{label}</span>
        </button>
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setOpen(open)
        }}
      >
        <DialogContent className="max-w-xl p-6">
          <div className="text-lg font-semibold mb-4">Account Details</div>

          {!user?.emailVerified ? (
            <div className="mb-6 rounded-md border border-gray-200 p-4">
              <div className="text-sm font-medium">Verification pending</div>
              <div className="text-sm text-gray-500 mt-1">
                Some environments require a verified email before another
                credential sign-in can complete.
              </div>
              <Button
                className="mt-4"
                disabled={resendVerificationMutation.isPending}
                onClick={() => resendVerificationMutation.mutate()}
              >
                {resendVerificationMutation.isPending
                  ? 'Sending...'
                  : 'Resend email'}
              </Button>
            </div>
          ) : null}

          <Form {...profileForm}>
            <form
              className="grid gap-3"
              onSubmit={profileForm.handleSubmit((values) =>
                handleUpdateProfile.mutate(values),
              )}
            >
              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input
                  disabled
                  value={user?.email ?? ''}
                  className="bg-gray-100"
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
                  <FormItem>
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
              <div className="flex justify-end mt-3">
                <Button className="rounded-lg w-40" type="submit">
                  {handleUpdateProfile.isPending
                    ? 'Loading...'
                    : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>

          <div className="border-t border-gray-200 mt-6 pt-6">
            <div className="text-lg font-semibold mb-4">Change password</div>
            <Form {...passwordForm}>
              <form
                className="grid gap-3"
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
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel>Revoke other sessions</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end mt-3">
                  <Button className="rounded-lg w-40" type="submit">
                    {changePasswordMutation.isPending
                      ? 'Loading...'
                      : 'Update password'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AccountSettingsButton
