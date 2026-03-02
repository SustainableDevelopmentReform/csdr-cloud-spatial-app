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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from '~/components/link'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'

const formSchema = z.object({
  email: z.string({ message: 'Email is required' }).email('Email is invalid'),
})

type FormData = z.infer<typeof formSchema>

export default function ForgotPasswordPage() {
  const authClient = useAuthClient()
  const { appUrl } = useConfig()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const form = useForm<FormData>({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(formSchema),
  })

  const requestResetMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: `${appUrl}/reset-password`,
      })

      if (res.error) {
        throw res.error
      }

      setSubmittedEmail(data.email)
    },
  })

  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      {submittedEmail ? (
        <>
          <div className="font-bold text-2xl mb-2 w-full">Check your email</div>
          <p className="text-sm text-gray-500 text-center mb-6 w-full">
            If <span className="font-medium">{submittedEmail}</span> belongs to
            an account, the reset instructions have been sent.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmittedEmail(null)
            }}
          >
            Send another request
          </Button>
        </>
      ) : (
        <>
          <div className="font-bold text-2xl mb-2 w-full">
            Forgot your password?
          </div>
          <p className="text-sm text-gray-500 mb-8 w-full">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
          <Form {...form}>
            <form
              className="grid gap-4 w-full"
              onSubmit={form.handleSubmit((data) =>
                requestResetMutation.mutate(data),
              )}
            >
              <FormField
                control={form.control}
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
              <Button type="submit" disabled={requestResetMutation.isPending}>
                {requestResetMutation.isPending
                  ? 'Sending...'
                  : 'Send reset link'}
              </Button>
            </form>
          </Form>
          <div className="text-sm mt-12">
            Remembered your password?{' '}
            <Link href="/login" className="text-blue-500">
              Return to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
