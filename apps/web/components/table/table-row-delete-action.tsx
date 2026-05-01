'use client'

import { UseMutationResult } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { DeleteAlertDialog } from '~/components/form/delete-alert-dialog'

type TableRowDeleteActionProps = {
  entityName: string
  itemName: string
  mutation: UseMutationResult<unknown, Error, void>
}

export const TableRowDeleteAction = ({
  entityName,
  itemName,
  mutation,
}: TableRowDeleteActionProps) => (
  <DeleteAlertDialog
    buttonVariant="outline"
    buttonSize="sm"
    buttonClassName="h-8 border-destructive px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
    buttonIcon={<Trash2 className="h-4 w-4" />}
    buttonTitle="Delete"
    confirmDialog={{
      title: `Delete ${entityName}`,
      description: `This action cannot be undone. This will permanently delete ${itemName}.`,
      buttonCancelTitle: 'Cancel',
    }}
    mutation={mutation}
  />
)
