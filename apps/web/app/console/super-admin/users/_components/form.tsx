import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import { Button } from '@repo/ui/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { QueryKey } from '~/utils/apiClient'
import { useAuthClient } from '~/hooks/useAuthClient'
import SignupForm from '~/app/sign-up/_components/form'

interface UserFormProps {
  children?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
}

const UserForm: React.FC<UserFormProps> = ({
  children,
  isOpen,
  onClose,
  onOpen,
}) => {
  const queryClient = useQueryClient()
  const authClient = useAuthClient()
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
        <DialogHeader>
          <DialogTitle className="text-3xl">Add User</DialogTitle>
        </DialogHeader>
        <div>
          <SignupForm
            mutationFn={async (data) => {
              const res = await authClient.admin.createUser({
                name: data.name,
                email: data.email,
                role: 'user',
                password: '123456',
              })

              if (res.error) {
                throw res.error
              } else {
                queryClient.invalidateQueries({
                  queryKey: [QueryKey.Users],
                })
                onClose && onClose()
              }
            }}
          />
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserForm
