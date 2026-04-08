import { ComponentProps } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog'
import { Button } from '@repo/ui/components/ui/button'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { UseMutationResult } from '@tanstack/react-query'

type DeleteAlertDialogProps = {
  buttonVariant: ComponentProps<typeof Button>['variant']
  buttonTitle: string
  disabled?: boolean
  confirmDialog: {
    title?: string
    description: string
    buttonCancelTitle?: string
    buttonConfirmTitle?: string
  }
} & (
  | {
      mutation: UseMutationResult<unknown, Error, void>
    }
  | {
      onDelete: () => void
    }
)

export const DeleteAlertDialog = (props: DeleteAlertDialogProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={props.buttonVariant}
          className="w-fit"
          disabled={props.disabled}
        >
          {props.buttonTitle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {props.confirmDialog.title ?? 'Are you sure?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {props.confirmDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {props.confirmDialog.buttonCancelTitle ?? 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if ('mutation' in props) {
                props.mutation.mutateAsync()
              } else {
                props.onDelete()
              }
            }}
          >
            {'mutation' in props && props.mutation.isPending ? (
              <LoadingIcon>'Loading...'</LoadingIcon>
            ) : (
              (props.confirmDialog.buttonConfirmTitle ?? props.buttonTitle)
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
