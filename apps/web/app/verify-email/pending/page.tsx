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
import { AuthShell } from '~/components/auth-shell'
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
    <AuthShell
      eyebrow="Email verification"
      title="Confirm your email first"
      description="Open the verification link from your inbox to finish the sign-in setup for this environment."
      footer={
        <>
          Already verified?{' '}
          <Link href="/login" className="font-semibold text-[#9d3c17]">
            Return to sign in
          </Link>
        </>
      }
    >
      {resentEmail ? (
        <div className="rounded-[28px] border border-[#1d3d35]/15 bg-[#1d3d35]/6 px-5 py-5">
          <div className="text-base font-semibold text-[#173129]">
            Verification email sent
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            If <span className="font-medium">{resentEmail}</span> is registered,
            a fresh verification link is on the way.
          </p>
          <Button
            variant="outline"
            className="mt-5 rounded-full border-stone-900/15"
            onClick={() => {
              setResentEmail(null)
            }}
          >
            Resend another email
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((data) => resendMutation.mutate(data))}
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
            <Button
              type="submit"
              disabled={resendMutation.isPending}
              className="mt-2 h-11 rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
            >
              {resendMutation.isPending
                ? 'Sending...'
                : 'Resend verification email'}
            </Button>
          </form>
        </Form>
      )}
    </AuthShell>
  )
}
