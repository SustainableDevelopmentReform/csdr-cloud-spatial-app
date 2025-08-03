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
import { authClient } from '../../../utils/auth'
import { Switch } from '@repo/ui/components/ui/switch'
import { useRouter } from 'next/navigation'
import { toast } from '@repo/ui/components/ui/sonner'

const formSchema = z.object({
  email: z.string({ message: 'Email is required' }).email('Email is invalid'),
  password: z.string({ message: 'Password is required' }),
  remember: z.boolean().optional(),
})

type Data = z.infer<typeof formSchema>

const LoginForm = () => {
  const router = useRouter()
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
      const res = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.remember,
      })

      if (res.error) {
        throw res.error
      } else {
        router.push('/')
      }
    },
  })

  async function onSubmit(data: Data) {
    submitMutation.mutate(data)
  }

  return (
    <>
      <Form {...form}>
        <form className="grid gap-4 w-full" onSubmit={handleSubmit(onSubmit)}>
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
