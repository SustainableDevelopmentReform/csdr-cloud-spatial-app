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
import { AuthShell } from '~/components/auth-shell'
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
    <AuthShell
      eyebrow="Password reset"
      title="Recover account access"
      description="We will send the reset link if the address belongs to an account. The response stays the same either way."
      footer={
        <>
          Remembered your password?{' '}
          <Link href="/login" className="font-semibold text-[#9d3c17]">
            Return to sign in
          </Link>
        </>
      }
    >
      {submittedEmail ? (
        <div className="rounded-[28px] border border-[#1d3d35]/15 bg-[#1d3d35]/6 px-5 py-5">
          <div className="text-base font-semibold text-[#173129]">
            Check your email
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            If <span className="font-medium">{submittedEmail}</span> belongs to
            an account, the reset instructions have been sent.
          </p>
          <Button
            variant="outline"
            className="mt-5 rounded-full border-stone-900/15"
            onClick={() => {
              setSubmittedEmail(null)
            }}
          >
            Send another request
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="grid gap-4"
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
            <Button
              type="submit"
              disabled={requestResetMutation.isPending}
              className="mt-2 h-11 rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
            >
              {requestResetMutation.isPending
                ? 'Sending...'
                : 'Send reset link'}
            </Button>
          </form>
        </Form>
      )}
    </AuthShell>
  )
}
