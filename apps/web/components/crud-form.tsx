import { zodResolver } from '@hookform/resolvers/zod'
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
import { UseMutationResult } from '@tanstack/react-query'
import { DefaultValues, Path, useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { BaseItem } from './crud-table'
import { formatDateTime } from '../utils/date'

export const baseFormSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.any().optional(),
})

interface CrudFormConfig<T extends BaseItem> {
  entityName?: string // e.g., "Dataset", "Product", "Geometry"
  entityNamePlural?: string // e.g., "datasets", "products", "geometries"
  readOnlyFields?: (keyof T)[] // Fields that should be displayed but not editable
  hiddenFields?: (keyof T)[] // Fields that should not be displayed at all
  fieldLabels?: Partial<Record<keyof T, string>> // Custom labels for fields
}

export const CrudForm = <Data extends BaseItem, Schema extends z.ZodSchema>({
  data,
  defaultValues,
  formSchema,
  updateMutation,
  deleteMutation,
  config = {},
}: {
  data: Data
  defaultValues: DefaultValues<z.infer<Schema>>
  formSchema: Schema
  updateMutation: UseMutationResult<
    unknown,
    Error,
    z.infer<Schema> & { id: string }
  >
  deleteMutation?: UseMutationResult<any, Error, { id: string }>
  config?: CrudFormConfig<Data>
}) => {
  const {
    entityName = 'Item',
    entityNamePlural = 'items',
    readOnlyFields = ['id', 'createdAt', 'updatedAt'],
    hiddenFields = [],
    fieldLabels = {},
  } = config

  const form = useForm<Data>({
    defaultValues: defaultValues,
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = form

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
    return !hiddenFields.includes(field)
  }

  // Helper function to check if field is read-only
  const isReadOnlyField = (field: keyof Data): boolean => {
    return readOnlyFields.includes(field)
  }

  return (
    <>
      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((formData) => {
            // Only send the fields that have changed and are not read-only
            const changedFields: z.infer<Schema> = {}
            Object.keys(formData).forEach((key) => {
              const fieldKey = key as keyof Data
              if (
                !isReadOnlyField(fieldKey) &&
                formData[fieldKey] !== data[fieldKey]
              ) {
                changedFields[fieldKey] = formData[fieldKey]
              }
            })
            if (Object.keys(changedFields).length > 0) {
              updateMutation.mutate({
                ...changedFields,
                id: data.id,
              })
            }
          })}
        >
          {/* Render read-only fields */}
          {shouldShowField('id') && (
            <FormItem>
              <FormLabel>{getFieldLabel('id')}</FormLabel>
              <Input disabled value={data?.id ?? ''} className="bg-gray-100" />
            </FormItem>
          )}

          {shouldShowField('name') && isReadOnlyField('name') && (
            <FormItem>
              <FormLabel>{getFieldLabel('name')}</FormLabel>
              <Input
                disabled
                value={data?.name ?? ''}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {shouldShowField('name') && !isReadOnlyField('name') && (
            <FormField
              control={control}
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
                value={formatDateTime(data?.createdAt)}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {shouldShowField('updatedAt') && isReadOnlyField('updatedAt') && (
            <FormItem>
              <FormLabel>{getFieldLabel('updatedAt')}</FormLabel>
              <Input
                disabled
                value={formatDateTime(data?.updatedAt)}
                className="bg-gray-100"
              />
            </FormItem>
          )}

          {/* Render editable description field if it exists */}
          {shouldShowField('description') && 'description' in data && (
            <FormField
              control={control}
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
          {'metadata' in data && shouldShowField('metadata') && (
            <FormField
              control={control}
              name={'metadata' as Path<Data>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getFieldLabel('metadata')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="font-mono bg-gray-100"
                      disabled
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

          <div>
            <Button className="mt-4" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">{entityName} actions</div>
        {deleteMutation && (
          <div className="mb-6">
            <div className="font-medium">Delete {entityName.toLowerCase()}</div>
            <div className="mb-3">
              Permanently remove the {entityName.toLowerCase()}, including all
              related {entityNamePlural}.
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Delete {entityName.toLowerCase()}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete{' '}
                    {data?.name} {entityName.toLowerCase()} and remove{' '}
                    {data?.name} dependents.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      data && deleteMutation.mutate({ id: data.id })
                    }
                  >
                    {match(deleteMutation)
                      .with({ isPending: true }, () => 'Loading...')
                      .otherwise(() => 'Continue')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </>
  )
}
