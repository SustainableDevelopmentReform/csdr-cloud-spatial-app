import { baseCreateRunResourceSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { Path, UseFormReturn } from 'react-hook-form'
import z from 'zod'

export interface CrudFormProps<
  Data extends z.infer<typeof baseCreateRunResourceSchema>,
> {
  form: UseFormReturn<Data>
  readOnlyFields?: (keyof Data | string)[] | 'all' // Fields that should be displayed but not editable
  hiddenFields?: (keyof Data | string)[] // Fields that should not be displayed at all
}

export const CrudFormRunFields = <
  Data extends z.infer<typeof baseCreateRunResourceSchema>,
>({
  form,
  readOnlyFields,
  hiddenFields,
}: CrudFormProps<Data>) => {
  // Helper function to check if field should be shown
  const shouldShowField = (field: keyof Data): boolean => {
    return !hiddenFields?.includes(field)
  }

  // Helper function to check if field is read-only
  const isReadOnlyField = (field: keyof Data): boolean => {
    return readOnlyFields === 'all' || !!readOnlyFields?.includes(field)
  }

  return (
    <>
      {shouldShowField('dataUrl') && (
        <FormField
          control={form.control}
          name={'dataUrl' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isReadOnlyField('dataUrl')}
                  className={isReadOnlyField('dataUrl') ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('dataType') && isReadOnlyField('dataType') && (
        <FormItem>
          <FormLabel>Data Type</FormLabel>
          <Input
            disabled
            value={form.getValues('dataType' as Path<Data>) ?? ''}
            className="bg-gray-100"
          />
        </FormItem>
      )}
      {shouldShowField('dataType') && !isReadOnlyField('dataType') && (
        <FormField
          control={form.control}
          name={'dataType' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Type</FormLabel>
              <Select {...field} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parquet">Parquet</SelectItem>
                  <SelectItem value="geoparquet">Geoparquet</SelectItem>
                  <SelectItem value="stac-geoparquet">
                    Stac Geoparquet
                  </SelectItem>
                  <SelectItem value="zarr">Zarr</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('dataSize') && (
        <FormField
          control={form.control}
          name={'dataSize' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Size</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={isReadOnlyField('dataSize')}
                  className={isReadOnlyField('dataSize') ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('dataEtag') && (
        <FormField
          control={form.control}
          name={'dataEtag' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Etag</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isReadOnlyField('dataEtag')}
                  className={isReadOnlyField('dataEtag') ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('imageCode') && (
        <FormField
          control={form.control}
          name={'imageCode' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image Code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isReadOnlyField('imageCode')}
                  className={isReadOnlyField('imageCode') ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('imageTag') && (
        <FormField
          control={form.control}
          name={'imageTag' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image Tag</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isReadOnlyField('imageTag')}
                  className={isReadOnlyField('imageTag') ? 'bg-gray-100' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('provenanceUrl') && (
        <FormField
          control={form.control}
          name={'provenanceUrl' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provenance URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isReadOnlyField('provenanceUrl')}
                  className={
                    isReadOnlyField('provenanceUrl') ? 'bg-gray-100' : ''
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {shouldShowField('provenanceJson') && (
        <FormField
          control={form.control}
          name={'provenanceJson' as Path<Data>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provenance JSON</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className={cn(
                    'font-mono',
                    isReadOnlyField('provenanceJson') ? 'bg-gray-100' : '',
                  )}
                  disabled={isReadOnlyField('provenanceJson')}
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
    </>
  )
}
