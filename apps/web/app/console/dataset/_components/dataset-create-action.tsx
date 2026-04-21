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
    </CrudFormDialog>
  )
}
