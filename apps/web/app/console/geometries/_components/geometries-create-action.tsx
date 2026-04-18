'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createGeometriesSchema } from '@repo/schemas/crud'
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
import { useCreateGeometries } from '../_hooks'

export const GeometriesCreateAction = () => {
  const createGeometries = useCreateGeometries()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const form = useForm({
    resolver: zodResolver(createGeometriesSchema),
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createGeometries}
      buttonText="Add Boundaries"
      entityName="Boundary"
      entityNamePlural="boundary sets"
      hideTrigger={
        !isHydrated || !canCreateConsoleResource(access, 'geometries')
      }
    >
      <FormField
        control={form.control}
        name="sourceUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Source URL</FormLabel>
            <FormControl>
              <Input {...field} />
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
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CrudFormDialog>
  )
}
