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
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthShell } from '~/components/auth-shell'
import Link from '~/components/link'
import { useAuthClient } from '~/hooks/useAuthClient'

const formSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    passwordConfirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'],
  })

type FormData = z.infer<typeof formSchema>

export default function ResetPasswordPage() {
  const authClient = useAuthClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')

  const form = useForm<FormData>({
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
    resolver: zodResolver(formSchema),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!token) {
        throw new Error('Reset token is missing or has expired.')
      }

      const res = await authClient.resetPassword({
        newPassword: data.password,
        token,
      })

      if (res.error) {
        throw res.error
      }

      router.push('/login?passwordReset=1')
    },
  })

  const hasInvalidToken = error === 'INVALID_TOKEN' || !token

  return (
    <AuthShell
      eyebrow="Reset password"
      title={hasInvalidToken ? 'Reset link expired' : 'Choose a new password'}
      description={
        hasInvalidToken
          ? 'Request a fresh reset link and start again.'
          : 'Set a new password for this account. Once complete, existing sessions are revoked.'
      }
      footer={
        <>
          Need a fresh link?{' '}
          <Link
            href="/forgot-password"
            className="font-semibold text-[#9d3c17]"
          >
            Request another reset
          </Link>
        </>
      }
    >
      {hasInvalidToken ? (
        <div className="rounded-[28px] border border-[#9d3c17]/15 bg-[#9d3c17]/6 px-5 py-5">
          <div className="text-base font-semibold text-[#7d2f11]">
            This reset link is no longer valid
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Password reset links can expire or become invalid after use.
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((data) =>
              resetPasswordMutation.mutate(data),
            )}
          >
            <FormField
              control={form.control}
              name="password"
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
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="mt-2 h-11 rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
            >
              {resetPasswordMutation.isPending
                ? 'Updating...'
                : 'Update password'}
            </Button>
          </form>
        </Form>
      )}
    </AuthShell>
  )
}
