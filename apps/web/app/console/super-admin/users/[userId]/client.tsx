'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog'
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
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { useAuthClient } from '~/hooks/useAuthClient'
import { QueryKey } from '~/utils/apiClient'
import {
  formatGlobalUserRole,
  globalUserRoleSchema,
} from '~/utils/access-control'
import { userIdSchema, useUser } from '../_hooks'
// import AssignOrgForm from './_components/assign-org-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { DeleteAlertDialog } from '~/components/form/delete-alert-dialog'
import { USERS_BASE_PATH } from '~/lib/paths'
import { useUnsavedChangesWarning } from '~/hooks/useUnsavedChangesWarning'

const formSchema = z.object({
  name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
  role: globalUserRoleSchema,
})

type Data = z.infer<typeof formSchema>

const UserProfile = () => {
  const authClient = useAuthClient()
  const params = useParams()
  const { userId } = userIdSchema.parse(params)
  const router = useRouter()

  const { data: user } = useUser(userId)

  const isSuspended = !!user?.banned
  const emailVerificationStatus = user
    ? user.emailVerified
      ? 'Verified'
      : 'Not verified'
    : 'Unknown'
  const twoFactorStatus = user
    ? user.twoFactorEnabled
      ? 'Enabled'
      : 'Disabled'
    : 'Unknown'

  const form = useForm<Data>({
    defaultValues: {
      name: '',
      role: 'user',
    },
    resolver: zodResolver(formSchema),
  })
  const queryClient = useQueryClient()

  const { control, handleSubmit } = form

  useUnsavedChangesWarning(form.formState.isDirty)

  useEffect(() => {
    if (user) {
      const parsedRole = globalUserRoleSchema.safeParse(user.role)

      form.reset({
        name: user.name ?? '',
        role: parsedRole.success ? parsedRole.data : 'user',
      })
    }
  }, [user, form])

  const updateUser = useMutation({
    mutationFn: async (data: Data) => {
      const res = await authClient.admin.updateUser({
        userId: userId,
        data: {
          name: data.name,
          role: data.role,
        },
      })

      if (res.error) {
        throw res.error
      }
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, userId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Users],
      })
      toast('Success update user')
    },
  })

  const impersonateUser = useMutation({
    mutationFn: async () => {
      if (!userId) return

      const res = await authClient.admin.impersonateUser({
        userId: userId,
      })

      if (res.error) {
        throw res.error
      }

      window.open('/', '_self')
    },
  })

  const suspendUser = useMutation({
    mutationFn: async () => {
      if (!userId) return

      const res = await authClient.admin.banUser({
        userId: userId,
      })

      if (res.error) {
        throw res.error
      }
      return res.data
    },
    onSuccess: () => {
      toast(`User: ${user?.name} is suspended`)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, userId],
      })
    },
  })

  const restoreUser = useMutation({
    mutationFn: async () => {
      if (!userId) return

      const res = await authClient.admin.unbanUser({
        userId: userId,
      })

      if (res.error) {
        throw res.error
      }
      return res.data
    },
    onSuccess: () => {
      toast(`User: ${user?.name} is restored`)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, userId],
      })
    },
  })

  const deleteUser = useMutation({
    mutationFn: async () => {
      if (!userId) return

      const res = await authClient.admin.removeUser({
        userId: userId,
      })

      if (res.error) {
        throw res.error
      }
      return res.data
    },
    onSuccess: () => {
      toast(`User: ${user?.name} is deleted`)
      router.replace(USERS_BASE_PATH)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, userId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Users],
      })
    },
  })

  function onSubmit(data: Data) {
    updateUser.mutate(data, {
      onSuccess: () => {
        form.reset(data)
      },
    })
  }

  return (
    <div className="w-[800px] max-w-full">
      <div className="text-2xl font-medium mb-8">Profile</div>
      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormItem>
            <FormLabel>User ID</FormLabel>
            <Input disabled value={user?.id ?? ''} className="bg-gray-100" />
          </FormItem>
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Email</FormLabel>
            <Input disabled value={user?.email ?? ''} className="bg-gray-100" />
          </FormItem>
          <FormItem>
            <FormLabel>Email verified</FormLabel>
            <Input
              disabled
              value={emailVerificationStatus}
              className="bg-gray-100"
            />
          </FormItem>
          <FormItem>
            <FormLabel>2FA status</FormLabel>
            <Input disabled value={twoFactorStatus} className="bg-gray-100" />
          </FormItem>

          <FormField
            control={control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select {...field} onValueChange={field.onChange}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button className="mt-4" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">Super admin actions</div>
        <div className="mb-6">
          <div className="font-medium">Impersonate user</div>
          <div className="mb-3">
            Temporarily login as the user. Use this carefully, all the actions
            that is taken will be permanent
          </div>
          <Button variant="outline" onClick={() => impersonateUser.mutate()}>
            {match(impersonateUser)
              .with({ isPending: true }, () => 'Loading...')
              .otherwise(() => 'Impersonate user')}
          </Button>
        </div>
        <div className="mb-6">
          <div className="font-medium">Suspend and restore user</div>
          <div className="mb-3">
            {match(isSuspended)
              .with(
                true,
                () =>
                  "Give the user back their access to all apps and organizations after they've been suspended.",
              )
              .otherwise(
                () =>
                  "Temporarily revoke the user's access to all applications until restored.",
              )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                {match(isSuspended)
                  .with(true, () => 'Restore user')
                  .otherwise(() => 'Suspend user')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will {isSuspended ? 'restore' : 'suspend'} {user?.name}{' '}
                  account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    isSuspended ? restoreUser.mutate() : suspendUser.mutate()
                  }
                >
                  {match(suspendUser.isPending || restoreUser.isPending)
                    .with(true, () => 'Loading...')
                    .otherwise(() => 'Continue')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="mb-6">
          <div className="font-medium">Delete user</div>
          <div className="mb-3">
            Permanently remove the user account and revoke access. Domain
            resources they created or published will remain, with user
            attribution marked as unassigned.
          </div>
          <DeleteAlertDialog
            buttonVariant="destructive"
            buttonTitle="Delete user"
            confirmDialog={{
              title: 'Are you absolutely sure?',
              description: `This action cannot be undone. This will permanently delete ${user?.name} account and revoke access, but domain resources they created or published will remain with unassigned attribution.`,
              buttonCancelTitle: 'Cancel',
            }}
            mutation={deleteUser}
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
        Effective global role: {formatGlobalUserRole(form.watch('role'))}
      </div>
    </div>
  )
}

export default UserProfile
