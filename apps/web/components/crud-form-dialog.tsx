import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import React, { useState } from 'react'
import { z } from 'zod'
import { CrudForm, CrudFormProps } from './crud-form'
import { Button } from '@repo/ui/components/ui/button'
import { baseCreateResourceSchema } from '@repo/schemas/crud'

interface CrudFormDialogProps<
  Data extends z.infer<typeof baseCreateResourceSchema>,
> extends CrudFormProps<Data> {
  buttonText?: string
  children?: React.ReactNode
  onOpen?: () => void
  onClose?: () => void
}

// Note we assume that this form is to CREATE, not UPDATE - so we set defaults accordingly
const CrudFormDialog = <Data extends z.infer<typeof baseCreateResourceSchema>>({
  buttonText,
  children,
  onOpen,
  onClose,
  hiddenFields = [],
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
      <DialogContent className="w-full w-[800px] max-w-full">
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
