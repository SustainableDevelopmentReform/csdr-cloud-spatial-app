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
import { cn } from '@repo/ui/lib/utils'
import { UseMutationResult } from '@tanstack/react-query'
import { ComponentProps } from 'react'

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
    <div className={cn(props.disabled && 'opacity-50')}>
      <div className="font-medium">{props.title}</div>
      <div className="mb-3">{props.description}</div>
      {props.confirmDialog ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={props.buttonVariant}>{props.buttonTitle}</Button>
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
              <AlertDialogAction onClick={() => props.mutation.mutateAsync()}>
                {props.mutation.isPending ? (
                  <LoadingIcon>'Loading...'</LoadingIcon>
                ) : (
                  'Continue'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          variant={props.buttonVariant}
          onClick={() => props.mutation.mutateAsync()}
          disabled={props.disabled}
        >
          {props.mutation.isPending ? (
            <LoadingIcon>'Loading...'</LoadingIcon>
          ) : (
            props.buttonTitle
          )}
        </Button>
      )}
    </div>
  )
}
