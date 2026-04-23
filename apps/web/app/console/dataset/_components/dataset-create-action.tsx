'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDatasetSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import { useAccessControl } from '~/hooks/useAccessControl'
import { useIsHydrated } from '~/hooks/useIsHydrated'
import { canCreateConsoleResource } from '~/utils/access-control'
import { useCreateDataset } from '../_hooks'

export const DatasetCreateAction = () => {
  const createDataset = useCreateDataset()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const form = useForm({
    resolver: zodResolver(createDatasetSchema),
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createDataset}
      buttonText="Add Dataset"
      entityName="Dataset"
      entityNamePlural="datasets"
      hideTrigger={!isHydrated || !canCreateConsoleResource(access, 'dataset')}
    >
      <FormField
        control={form.control}
        name="sourceUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Source URL</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="sourceMetadataUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Source Metadata URL</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="style"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Style (JSON)</FormLabel>
            <FormControl>
              <Textarea
                placeholder='{"type":"raster","display":"categorical","asset":"mangroves","values":{"1":{"color":"rgba(0,196,23,1)","label":"Mangrove"}}}'
                className="font-mono text-xs"
                rows={4}
                value={
                  field.value != null
                    ? typeof field.value === 'string'
                      ? field.value
                      : JSON.stringify(field.value, null, 2)
                    : ''
                }
                onChange={(e) => {
                  const raw = e.target.value
                  if (!raw.trim()) {
                    field.onChange(null)
                    return
                  }
                  try {
                    field.onChange(JSON.parse(raw))
                  } catch {
                    // Keep raw string so the user can keep typing
                    field.onChange(raw)
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CrudFormDialog>
  )
}
