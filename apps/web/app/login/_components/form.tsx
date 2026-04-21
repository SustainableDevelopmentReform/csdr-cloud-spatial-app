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
import { useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
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

const inputClassName =
  'h-9 rounded-lg border-neutral-200 bg-white text-sm text-neutral-950 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground focus-visible:border-neutral-900 focus-visible:ring-0'

const labelClassName = 'text-sm font-medium leading-4 text-neutral-950'

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
              className="rounded-lg bg-neutral-100 px-4 py-3"
            >
              <div className="text-sm font-semibold text-neutral-950">
                {notice.title}
              </div>
              <div className="mt-1 text-sm leading-5 text-muted-foreground">
                {notice.description}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <Form {...form}>
        <form
          method="post"
          className="grid w-full gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClassName}>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Email"
                    className={inputClassName}
                    value={field.value ?? ''}
                  />
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
                  <FormLabel className={labelClassName}>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    tabIndex={-1}
                    className="text-sm leading-5 text-muted-foreground underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Password"
                    className={inputClassName}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="remember"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(event) => {
                          field.onChange(event.target.checked)
                        }}
                        className="peer sr-only"
                      />
                    </FormControl>
                    <span className="flex size-4 items-center justify-center rounded-[4px] border border-neutral-900 bg-white text-transparent shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.10),0px_1px_3px_0px_rgba(0,0,0,0.10)] transition-colors peer-checked:bg-neutral-900 peer-checked:text-neutral-50">
                      <Check className="size-3" />
                    </span>
                    <span className="text-sm font-medium leading-4 text-neutral-950">
                      Keep me signed in
                    </span>
                  </label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            disabled={submitMutation.isPending}
            animate={false}
            className="mt-1 w-full rounded-lg bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90"
          >
            {submitMutation.isPending ? 'Loading...' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </>
  )
}

export default LoginForm
