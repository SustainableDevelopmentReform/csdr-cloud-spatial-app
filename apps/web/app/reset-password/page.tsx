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
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      {hasInvalidToken ? (
        <>
          <div className="font-bold text-2xl mb-2 w-full">
            Reset link expired
          </div>
          <p className="text-sm text-gray-500 text-center mb-6 w-full">
            Password reset links can expire or become invalid after use.
          </p>
          <div className="text-sm">
            Need a fresh link?{' '}
            <Link href="/forgot-password" className="text-blue-500">
              Request another reset
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="font-bold text-2xl mb-2 w-full">
            Choose a new password
          </div>
          <p className="text-sm text-gray-500 mb-8 w-full">
            Set a new password for this account. Once complete, existing
            sessions are revoked.
          </p>
          <Form {...form}>
            <form
              className="grid gap-4 w-full"
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
                      <Input
                        {...field}
                        type="password"
                        value={field.value ?? ''}
                      />
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
                      <Input
                        {...field}
                        type="password"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending
                  ? 'Updating...'
                  : 'Update password'}
              </Button>
            </form>
          </Form>
          <div className="text-sm mt-12">
            Need a fresh link?{' '}
            <Link href="/forgot-password" className="text-blue-500">
              Request another reset
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
