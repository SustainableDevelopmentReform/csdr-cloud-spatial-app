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
import { useMutation } from '@tanstack/react-query'
import Link from '~/components/link'
import { useConfig } from '~/components/providers'
import { isAuthErrorMessage } from '~/utils/auth-errors'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuthClient } from '~/hooks/useAuthClient'
import TwoFactorForm from './two-factor-form'

const formSchema = z.object({
  email: z.string({ message: 'Email is required' }).email('Email is invalid'),
  password: z.string({ message: 'Password is required' }),
  remember: z.boolean().optional(),
})

type Data = z.infer<typeof formSchema>

const LoginForm = () => {
  const authClient = useAuthClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appUrl } = useConfig()
  const [twoFactorPending, setTwoFactorPending] = useState(false)
  const form = useForm<Data>({
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
    resolver: zodResolver(formSchema),
  })
  const { control, handleSubmit } = form

  const submitMutation = useMutation({
    mutationFn: async (data: Data) => {
      const res = await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
          rememberMe: data.remember,
          callbackURL: `${appUrl}/login?emailVerified=1`,
        },
        {
          onSuccess(context) {
            if (
              context.data &&
              'twoFactorRedirect' in context.data &&
              context.data.twoFactorRedirect
            ) {
              setTwoFactorPending(true)
              return
            }

            router.push('/')
          },
        },
      )

      if (res.error) {
        if (isAuthErrorMessage(res.error, 'Email not verified')) {
          router.push(
            `/verify-email/pending?email=${encodeURIComponent(data.email)}`,
          )
          return
        }

        throw res.error
      }
    },
  })

  async function onSubmit(data: Data) {
    submitMutation.mutate(data)
  }

  const notices = [
    searchParams.get('emailVerified') === '1'
      ? {
          title: 'Email verified',
          description:
            'Your address has been confirmed. You can continue signing in.',
        }
      : null,
    searchParams.get('passwordReset') === '1'
      ? {
          title: 'Password updated',
          description:
            'Use your new password the next time you sign in on this device.',
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string }>

  if (twoFactorPending) {
    return (
      <TwoFactorForm
        onCancel={() => setTwoFactorPending(false)}
        onSuccess={() => router.push('/')}
      />
    )
  }

  return (
    <>
      {notices.length > 0 ? (
        <div className="mb-4 grid gap-3">
          {notices.map((notice) => (
            <div
              key={notice.title}
              className="rounded-md border border-[#1d3d35]/15 bg-[#1d3d35]/6 px-4 py-3"
            >
              <div className="text-sm font-semibold text-[#173129]">
                {notice.title}
              </div>
              <div className="mt-1 text-sm leading-6 text-stone-600">
                {notice.description}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <Form {...form}>
        <form
          method="post"
          className="grid gap-4 w-full"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    tabIndex={-1}
                    className="text-sm text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormLabel>Remember me</FormLabel>
                <FormControl>
                  <Switch
                    {...field}
                    value={field.value ? 'true' : 'false'}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                    }}
                    className="mt-0!"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={submitMutation.isPending} className="mt-1">
            {submitMutation.isPending ? 'Loading...' : 'Log in'}
          </Button>
        </form>
      </Form>
    </>
  )
}

export default LoginForm
