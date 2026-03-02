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
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const createUserSchema = z
  .object({
    email: z.string({ message: 'Email is required' }).email('Email is invalid'),
    name: z.string({ message: 'Full name is required' }),
    password: z.string({ message: 'Password is required' }),
    passwordConfirmation: z
      .string({ message: 'Password confirmation is required' })
      .min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'],
  })

type CreateUserData = z.infer<typeof createUserSchema>

const SignupForm = ({
  mutationFn,
}: {
  mutationFn: (data: CreateUserData) => Promise<void>
}) => {
  const form = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      passwordConfirmation: '',
    },
  })
  const { control, handleSubmit } = form

  const submitMutation = useMutation({
    mutationFn,
  })

  async function onSubmit(data: CreateUserData) {
    submitMutation.mutate(data)
  }

  return (
    <>
      <Form {...form}>
        <form
          method="post"
          className="grid gap-4 w-full"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password Confirmation</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            disabled={submitMutation.isPending}
            className="mt-2 h-11 rounded-full bg-[#9d3c17] text-[#fff8f2] hover:bg-[#842f10]"
          >
            {submitMutation.isPending ? 'Loading...' : 'Create your account'}
          </Button>
        </form>
      </Form>
    </>
  )
}

export default SignupForm
