'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema } from '@repo/schemas/crud'
import { FormField, FormItem, FormMessage } from '@repo/ui/components/ui/form'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import { useAccessControl } from '~/hooks/useAccessControl'
import { useIsHydrated } from '~/hooks/useIsHydrated'
import { canCreateConsoleResource } from '~/utils/access-control'
import { DatasetSelect } from '../../dataset/_components/dataset-select'
import { GeometriesSelect } from '../../geometries/_components/geometries-select'
import { useCreateProduct } from '../_hooks'

export const ProductCreateAction = () => {
  const createProduct = useCreateProduct()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const form = useForm({
    resolver: zodResolver(createProductSchema),
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createProduct}
      entityName="Product"
      entityNamePlural="Products"
      buttonText="Add Product"
      hideTrigger={!isHydrated || !canCreateConsoleResource(access, 'product')}
    >
      <FormField
        control={form.control}
        name="datasetId"
        render={({ field }) => (
          <FormItem>
            <DatasetSelect
              value={field.value}
              onChange={(selectedDataset) =>
                field.onChange(selectedDataset?.id)
              }
              isClearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geometriesId"
        render={({ field }) => (
          <FormItem>
            <GeometriesSelect
              value={field.value}
              onChange={(selectedGeometries) =>
                field.onChange(selectedGeometries?.id)
              }
              isClearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </CrudFormDialog>
  )
}
