import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { QueryKey } from '~/utils/fetcher'
import { authClient } from '../../../../utils/auth'
import SignupForm from '../../../sign-up/_components/form'

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
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Add User</DialogTitle>
        </DialogHeader>
        <div>
          <SignupForm
            mutationFn={async (data) => {
              await authClient.admin.createUser({
                name: data.name,
                email: data.email,
                role: 'user',
                password: '123456',
              })

              queryClient.invalidateQueries({
                queryKey: [QueryKey.Users],
              })
              onClose && onClose()
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserForm
