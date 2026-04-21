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
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from '~/components/link'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'

const formSchema = z.object({
  email: z.string({ message: 'Email is required' }).email('Email is invalid'),
})

type FormData = z.infer<typeof formSchema>

export default function VerifyEmailPendingPage() {
  const authClient = useAuthClient()
  const searchParams = useSearchParams()
  const { appUrl } = useConfig()
  const [resentEmail, setResentEmail] = useState<string | null>(null)

  const initialEmail = useMemo(
    () => searchParams.get('email') ?? '',
    [searchParams],
  )

  const form = useForm<FormData>({
    defaultValues: {
      email: initialEmail,
    },
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (formSchema.shape.email.safeParse(initialEmail).success) {
      form.setValue('email', initialEmail)
    }
  }, [form, initialEmail])

  const resendMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await authClient.sendVerificationEmail({
        email: data.email,
        callbackURL: `${appUrl}/login?emailVerified=1`,
      })

      if (res.error) {
        throw res.error
      }

      setResentEmail(data.email)
    },
  })

  return (
    <div className="w-full px-10 max-w-lg mx-auto h-screen flex items-center flex-col justify-center">
      {resentEmail ? (
        <>
          <div className="font-bold text-2xl mb-2 w-full">
            Verification email sent
          </div>
          <p className="text-sm text-gray-500 text-center mb-6 w-full">
            If <span className="font-medium">{resentEmail}</span> is registered,
            a fresh verification link is on the way.
          </p>
          <Button variant="outline" onClick={() => setResentEmail(null)}>
            Resend another email
          </Button>
        </>
      ) : (
        <>
          <div className="font-bold text-2xl mb-2 w-full">
            Confirm your email first
          </div>
          <p className="text-sm text-gray-500 mb-8 w-full">
            Open the verification link from your inbox to finish the sign-in
            setup for this environment.
          </p>
          <Form {...form}>
            <form
              className="grid gap-4 w-full"
              onSubmit={form.handleSubmit((data) =>
                resendMutation.mutate(data),
              )}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={resendMutation.isPending}>
                {resendMutation.isPending
                  ? 'Sending...'
                  : 'Resend verification email'}
              </Button>
            </form>
          </Form>
          <div className="text-sm mt-12">
            Already verified?{' '}
            <Link href="/login" className="text-blue-500">
              Return to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
