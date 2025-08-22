'use client'

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
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { formatDateTime } from '../../../../../../utils/date'
import { DetailCard } from '../../../../_components/detail-cards'
import { MainRunBadge } from '../../../../_components/main-run-badge'
import { useDatasetRunLink } from '../../../../datasets/_hooks'
import { useGeometriesLink } from '../../../../geometries/_hooks'
import { ProductRunSummaryCard } from '../../../_components/product-run-summary-card'
import {
  useDeleteProductRun,
  useProduct,
  useProductRun,
  useProductRunLink,
  useUpdateProductRun,
} from '../../../_hooks'

const formSchema = z.object({
  id: z.string().readonly(),
  description: z.string().nullable().optional(),
  parameters: z.any().optional().readonly(),
})

type Data = z.infer<typeof formSchema>

const ProductRunDetails = () => {
  const { data: productRun } = useProductRun()
  const updateProductRun = useUpdateProductRun()
  const deleteProductRun = useDeleteProductRun('/console/productRuns')
  const productRunLink = useProductRunLink()
  const datasetRunLink = useDatasetRunLink()
  const geometriesLink = useGeometriesLink()
  const { data: product } = useProduct()
  const form = useForm<Data>({
    defaultValues: {
      description: '',
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = form

  useEffect(() => {
    if (!productRun) return
    form.reset(productRun)
  }, [productRun])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium flex items-center gap-2">
        ProductRun Details
        {product?.mainRun && productRun?.id === product?.mainRun?.id && (
          <MainRunBadge variant="product" />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} productRun={productRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {productRun && (
            <DetailCard
              title={`${productRun?.outputSummary?.outputCount} ${pluralize(productRun?.outputSummary?.outputCount, 'output', 'outputs')}`}
              description="Outputs"
              actionText="Open"
              actionLink={`${productRunLink(productRun)}/outputs`}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {productRun?.datasetRun && (
            <DetailCard
              title={productRun?.datasetRun?.dataset?.name}
              description="Dataset Run"
              actionText="Open"
              actionLink={datasetRunLink(productRun?.datasetRun)}
              actionIcon={<ArrowUpRightIcon />}
              footer={`Created: ${formatDateTime(productRun?.datasetRun?.createdAt)}`}
              subFooter={productRun?.datasetRun?.id}
            />
          )}
          {productRun?.geometriesRun && (
            <DetailCard
              title={productRun?.geometriesRun?.geometries?.name}
              description="Geometries Run"
              actionText="Open"
              actionLink={geometriesLink(productRun?.geometriesRun?.geometries)}
              actionIcon={<ArrowUpRightIcon />}
              footer={`Created: ${formatDateTime(productRun?.geometriesRun?.createdAt)}`}
              subFooter={productRun?.geometriesRun?.id}
            />
          )}
        </div>
      </div>

      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((data) => updateProductRun.mutate(data))}
        >
          <FormItem>
            <FormLabel>ProductRun ID</FormLabel>
            <Input
              disabled
              value={productRun?.id ?? ''}
              className="bg-gray-100"
            />
          </FormItem>

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="parameters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parameters</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="font-mono"
                    disabled
                    value={JSON.stringify(field.value, null, 2) ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button className="mt-4" disabled={updateProductRun.isPending}>
              {updateProductRun.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">ProductRun actions</div>
        <div className="mb-6">
          <div className="font-medium">Delete productRun</div>
          <div className="mb-3">
            Permanently remove the productRun, including all productRun runs.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete productRun</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {productRun?.product?.name} productRun and remove{' '}
                  {productRun?.product?.name} data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    productRun && deleteProductRun.mutate(productRun)
                  }
                >
                  {match(deleteProductRun)
                    .with({ isPending: true }, () => 'Loading...')
                    .otherwise(() => 'Continue')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

export default ProductRunDetails
