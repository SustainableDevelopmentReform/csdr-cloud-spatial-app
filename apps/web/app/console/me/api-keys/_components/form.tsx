import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import { toast } from '@repo/ui/components/ui/sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState } from 'react'
import { QueryKey } from '~/utils/apiClient'
import { useAuthClient } from '~/hooks/useAuthClient'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/ui/button'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from '@repo/ui/components/ui/form'

import { useForm } from 'react-hook-form'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'

const createApiKeySchema = z.object({
  name: z.string(),
  expiresInHours: z.string().optional(),
})

interface ApiKeyFormProps {
  children?: React.ReactNode
  isOpen?: boolean
  onClose: () => void
  onOpen: () => void
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({
  children,
  isOpen,
  onClose,
  onOpen,
}) => {
  const authClient = useAuthClient()
  const [apiKey, setApiKey] = useState<string | undefined>()

  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof createApiKeySchema>>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: '',
    },
  })
  const { control, handleSubmit } = form

  const createApiKey = useMutation({
    mutationFn: async (data: z.infer<typeof createApiKeySchema>) => {
      const res = await authClient.apiKey.create({
        name: data.name,
        expiresIn: data.expiresInHours
          ? parseInt(data.expiresInHours) * 60 * 60
          : null,
        // prefix: 'project-api-key',
        // metadata: { someKey: 'someValue' },
        // permissions,
      })

      if (res.error) {
        throw res.error
      }

      setApiKey(res.data.key)
      toast(`API key created`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ApiKeys],
      })
    },
  })

  async function onSubmit(data: z.infer<typeof createApiKeySchema>) {
    createApiKey.mutate(data)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          onOpen && onOpen()
        } else {
          onClose && onClose()
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[800px] max-w-full">
        {apiKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl">Copy API Key</DialogTitle>
              <DialogDescription>
                Once you've created an API key, you cannot see it again.
                <br />
                Use the <span className="font-mono font-bold">
                  x-api-key
                </span>{' '}
                header to make authenticated requests.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Textarea
                disabled
                value={apiKey}
                className="bg-gray-100 font-mono select-text resize-none cursor-text disabled:cursor-text"
              />
              <Button
                className="mt-1"
                onClick={() => {
                  setApiKey(undefined)
                  onClose()
                }}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl">Add API Key</DialogTitle>
            </DialogHeader>
            <div>
              <Form {...form}>
                <form
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
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="expiresInHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expires in (hours)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={createApiKey.isPending} className="mt-1">
                    {createApiKey.isPending ? 'Loading...' : 'Create API key'}
                  </Button>
                </form>
              </Form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyForm
