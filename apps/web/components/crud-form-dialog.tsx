import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import React, { useState } from 'react'
import { z } from 'zod'
import { baseFormSchema, CrudForm, CrudFormProps } from './crud-form'
import { Button } from '@repo/ui/components/ui/button'

interface CrudFormDialogProps<Data extends z.infer<typeof baseFormSchema>>
  extends CrudFormProps<Data> {
  buttonText?: string
  children?: React.ReactNode
  onOpen?: () => void
  onClose?: () => void
}

// Note we assume that this form is to CREATE, not UPDATE - so we set defaults accordingly
const CrudFormDialog = <Data extends z.infer<typeof baseFormSchema>>({
  buttonText,
  children,
  onOpen,
  onClose,
  hiddenFields = ['createdAt', 'updatedAt'],
  readOnlyFields = [],
  ...formProps
}: CrudFormDialogProps<Data>) => {
  const [isOpen, setOpen] = useState(false)
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open)
        if (open) {
          onOpen?.()
        } else {
          onClose?.()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>{buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">
            {formProps.entityName ?? 'Add Item'}
          </DialogTitle>
        </DialogHeader>
        <CrudForm
          hiddenFields={hiddenFields}
          readOnlyFields={readOnlyFields}
          {...formProps}
          onSuccess={() => {
            setOpen(false)
            formProps.onSuccess?.()
          }}
        >
          {children}
        </CrudForm>
      </DialogContent>
    </Dialog>
  )
}

export default CrudFormDialog
