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
import { useUser } from '../_hooks'
// import AssignOrgForm from './_components/assign-org-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'

const formSchema = z.object({
  name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
  role: z.enum(['admin', 'user']),
})

type Data = z.infer<typeof formSchema>

const UserProfile = () => {
  const authClient = useAuthClient()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const { data: user } = useUser(id)

  const isSuspended = !!user?.banned

  const form = useForm<Data>({
    defaultValues: {
      name: '',
      role: 'user',
    },
    resolver: zodResolver(formSchema),
  })
  const queryClient = useQueryClient()

  const { control, handleSubmit, setValue } = form

  useEffect(() => {
    setValue('name', user?.name ?? '')
    setValue('role', (user?.role ?? 'user') as 'admin' | 'user')
  }, [user])

  const updateUser = useMutation({
    mutationFn: async (data: Data) => {
      const res = await authClient.admin.updateUser({
        userId: id,
        data: {
          name: data.name,
          role: data.role,
        },
      })

      if (res.error) {
        throw res.error
      }

      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Users],
      })
      toast('Success update user')
    },
  })

  const impersonateUser = useMutation({
    mutationFn: async () => {
      if (!id) return

      const res = await authClient.admin.impersonateUser({
        userId: id,
      })

      if (res.error) {
        throw res.error
      }

      window.open('/', '_self')
    },
  })

  const suspendUser = useMutation({
    mutationFn: async () => {
      if (!id) return

      const res = await authClient.admin.banUser({
        userId: id,
      })

      if (res.error) {
        throw res.error
      }

      toast(`User: ${user?.name} is suspended`)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, id],
      })
    },
  })

  const restoreUser = useMutation({
    mutationFn: async () => {
      if (!id) return

      const res = await authClient.admin.unbanUser({
        userId: id,
      })

      if (res.error) {
        throw res.error
      }

      toast(`User: ${user?.name} is restored`)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, id],
      })
    },
  })

  const deleteUser = useMutation({
    mutationFn: async () => {
      if (!id) return

      const res = await authClient.admin.removeUser({
        userId: id,
      })

      if (res.error) {
        throw res.error
      }

      toast(`User: ${user?.name} is deleted`)
      router.replace('/console/users')
      queryClient.invalidateQueries({
        queryKey: [QueryKey.UserProfile, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Users],
      })
    },
  })

  function onSubmit(data: Data) {
    updateUser.mutate(data)
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Email</FormLabel>
            <Input disabled value={user?.email ?? ''} className="bg-gray-100" />
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
                    <SelectItem value="admin">Admin</SelectItem>
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
      {/* <div className="flex justify-between mt-8 border-b border-gray-200 pb-8">
          <div>
            <div className="text-xl mb-1 font-medium">Organizations</div>
            <div>Choose which organizations this user belongs to</div>
          </div>
          <AssignOrgForm>
            <button className="hover:underline">Edit organizations</button>
          </AssignOrgForm>
        </div> */}
      {/* <div className="border-b border-gray-200 pb-8 pt-4 grid gap-5">
          {data?.organizations.map(({ id, name }) => (
            <div key={`user-orgs-${id}`} className="flex justify-between">
              <div>{name}</div>
              <Link
                className="hover:underline"
                href={`/console/organizations/${id}`}
              >
                View organization
              </Link>
            </div>
          ))}
        </div> */}

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">Admin actions</div>
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
            Permanently remove the user from all organizations and applications.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete user</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {user?.name} account and remove {user?.name} data from our
                  servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteUser.mutate()}>
                  {match(deleteUser)
                    .with({ isPending: true }, () => 'Loading...')
                    .otherwise(() => 'Continue')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
