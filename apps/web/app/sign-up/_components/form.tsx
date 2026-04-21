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

const inputClassName =
  'h-9 rounded-lg border-neutral-200 bg-white text-sm text-neutral-950 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground focus-visible:border-neutral-900 focus-visible:ring-0'

const labelClassName = 'text-sm font-medium leading-4 text-neutral-950'

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
          className="grid w-full gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClassName}>Full name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Full name"
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
                <FormLabel className={labelClassName}>Password</FormLabel>
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
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClassName}>
                  Confirm password
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Confirm password"
                    className={inputClassName}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            disabled={submitMutation.isPending}
            animate={false}
            className="mt-1 w-full rounded-lg bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90"
          >
            {submitMutation.isPending ? 'Loading...' : 'Sign up'}
          </Button>
        </form>
      </Form>
    </>
  )
}

export default SignupForm
