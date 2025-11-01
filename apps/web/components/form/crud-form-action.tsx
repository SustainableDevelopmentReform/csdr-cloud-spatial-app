import { Button } from '@repo/ui/components/ui/button'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { UseMutationResult } from '@tanstack/react-query'
import { ComponentProps } from 'react'
import { FieldGroup } from './action'
import { DeleteAlertDialog } from './delete-alert-dialog'

export type CrudFormAction = {
  title: string
  description: string
  buttonVariant: ComponentProps<typeof Button>['variant']
  mutation: UseMutationResult<unknown, Error, void>
  buttonTitle: string
  confirmDialog?: {
    title?: string
    description: string
    buttonCancelTitle?: string
  }
  disabled?: boolean
}

export const FormAction = (props: CrudFormAction) => {
  return (
    <FieldGroup {...props}>
      {props.confirmDialog ? (
        <DeleteAlertDialog
          buttonVariant={props.buttonVariant}
          buttonTitle={props.buttonTitle}
          confirmDialog={props.confirmDialog}
          mutation={props.mutation}
        />
      ) : (
        <Button
          variant={props.buttonVariant}
          onClick={() => props.mutation.mutateAsync()}
          disabled={props.disabled}
          className="w-fit"
        >
          {props.mutation.isPending ? (
            <LoadingIcon>'Loading...'</LoadingIcon>
          ) : (
            props.buttonTitle
          )}
        </Button>
      )}
    </FieldGroup>
  )
}
