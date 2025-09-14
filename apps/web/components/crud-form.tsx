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
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { UseMutationResult } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Path, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { formatDateTime } from '../utils/date'
import { CrudFormAction, FormAction } from './crud-form-action'
import { toast } from '@repo/ui/components/ui/sonner'

export const baseFormSchema = z.object({
  id: z.string().optional().readonly(),
  createdAt: z.string().optional().readonly(),
  updatedAt: z.string().optional().readonly(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

export interface CrudFormConfig<Data extends z.infer<typeof baseFormSchema>> {
  entityName: string // e.g., "Dataset", "Product", "Geometry"
  entityNamePlural: string // e.g., "datasets", "products", "geometries"
  readOnlyFields?: (keyof Data | string)[] // Fields that should be displayed but not editable
  hiddenFields?: (keyof Data | string)[] // Fields that should not be displayed at all
  fieldLabels?: Partial<Record<keyof Data, string>> // Custom labels for fields
}

export interface CrudFormProps<Data extends z.infer<typeof baseFormSchema>>
  extends CrudFormConfig<Data> {
  form: UseFormReturn<Data>
  mutation: UseMutationResult<unknown, Error, Data>
  deleteMutation?: UseMutationResult<unknown, Error, void>
  actions?: CrudFormAction[]
  children?: React.ReactNode | React.ReactNode[]
  onSuccess?: () => void
}

export const CrudForm = <Data extends z.infer<typeof baseFormSchema>>({
  form,
  mutation,
  deleteMutation,
  actions: actionsProp,
  children,
  entityName,
  entityNamePlural,
  readOnlyFields,
  hiddenFields,
  fieldLabels,
  onSuccess,
}: CrudFormProps<Data>) => {
  // Helper function to get field label
  const getFieldLabel = (field: keyof Data): string => {
    if (fieldLabels) {
      const label = fieldLabels[field as keyof typeof fieldLabels]
      if (label) return label
    }
    // Convert field name to title case
    return String(field)
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  // Helper function to check if field should be shown
  const shouldShowField = (field: keyof Data): boolean => {
    return !hiddenFields?.includes(field)
  }

  // Helper function to check if field is read-only
  const isReadOnlyField = (field: keyof Data): boolean => {
    return !!readOnlyFields?.includes(field)
  }

  const deleteAction: CrudFormAction | undefined = useMemo(() => {
    if (!deleteMutation) return undefined
    return {
      title: `Delete ${entityName}`,
      description: `Permanently remove the ${entityName?.toLowerCase()}, including all dependents.`,
      buttonVariant: 'destructive',
      buttonTitle: 'Continue',
      mutation: deleteMutation,
      confirmDialog: {
        title: `Are you sure?`,
        description: `This action cannot be undone. This will permanently delete ${form.getValues('name' as Path<Data>)} ${entityName?.toLowerCase()} and remove ${form.getValues('name' as Path<Data>)} dependents.`,
        buttonCancelTitle: 'Cancel',
      },
    }
  }, [entityName, deleteMutation, form])

  const actions = useMemo(() => {
    return [...(actionsProp ?? []), deleteAction ?? undefined]
  }, [actionsProp, deleteAction]).filter(Boolean) as CrudFormAction[]

  return (
    <>
      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={form.handleSubmit((formData) => {
            mutation.mutate(formData, {
              onSuccess: () => {
                toast.success(`Created ${entityName} successfully`)
                onSuccess?.()
              },
            })
          })}
        >
          {/* Render read-only fields */}
          {shouldShowField('id') && (
            <FormItem>
              <FormLabel>{getFieldLabel('id')}</FormLabel>
              <Input
                disabled
                value={form.getValues('id' as Path<Data>) ?? ''}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {shouldShowField('name') && isReadOnlyField('name') && (
            <FormItem>
              <FormLabel>{getFieldLabel('name')}</FormLabel>
              <Input
                disabled
                value={form.getValues('name' as Path<Data>) ?? ''}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {shouldShowField('name') && !isReadOnlyField('name') && (
            <FormField
              control={form.control}
              name={'name' as Path<Data>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getFieldLabel('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {shouldShowField('createdAt') && isReadOnlyField('createdAt') && (
            <FormItem>
              <FormLabel>{getFieldLabel('createdAt')}</FormLabel>
              <Input
                disabled
                value={formatDateTime(
                  form.getValues('createdAt' as Path<Data>),
                )}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {shouldShowField('updatedAt') && isReadOnlyField('updatedAt') && (
            <FormItem>
              <FormLabel>{getFieldLabel('updatedAt')}</FormLabel>
              <Input
                disabled
                value={formatDateTime(
                  form.getValues('updatedAt' as Path<Data>),
                )}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {/* Render editable description field if it exists */}
          {shouldShowField('description') && (
            <FormField
              control={form.control}
              name={'description' as Path<Data>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getFieldLabel('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      disabled={isReadOnlyField('description')}
                      className={
                        isReadOnlyField('description') ? 'bg-gray-100' : ''
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Render metadata field if it exists */}
          {shouldShowField('metadata') && (
            <FormField
              control={form.control}
              name={'metadata' as Path<Data>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getFieldLabel('metadata')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className={cn(
                        'font-mono',
                        isReadOnlyField('metadata') ? 'bg-gray-100' : '',
                      )}
                      disabled={isReadOnlyField('metadata')}
                      value={
                        typeof field.value === 'object'
                          ? JSON.stringify(field.value, null, 2)
                          : field.value
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {children}

          <div>
            <Button className="mt-4" disabled={mutation.isPending}>
              {mutation.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      {actions.length > 0 && (
        <div className="mt-8 border-b border-gray-200 pb-8 flex flex-col gap-6">
          <div className="text-xl font-medium">{entityName} actions</div>

          {actions.map((action, index) => (
            <FormAction {...action} key={index} />
          ))}
        </div>
      )}
    </>
  )
}
