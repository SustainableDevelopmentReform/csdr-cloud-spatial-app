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
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
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
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { z } from 'zod'
import Link from '../../../../../../../../components/link'
import { useDatasetLink } from '../../../../../../datasets/_hooks'
import { useGeometriesLink } from '../../../../../../geometries/_hooks'
import {
  useDeleteProductRun,
  useProduct,
  useProductRun,
  useProductRunLink,
  useUpdateProductRun,
} from '../../../../../_hooks'
import { formatDate, formatDateTime } from '../../../../../../../../utils/date'
import { ProductRunSummaryCard } from '../../../../../_components/product-run-summary-card'
import { Badge } from '@repo/ui/components/ui/badge'

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
  const datasetLink = useDatasetLink()
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
        {productRun?.id === product?.mainRun?.id && (
          <Badge color="primary">Main Run</Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} productRun={productRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {productRun && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Outputs</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {`${productRun?.outputSummary?.outputCount} output${productRun?.outputSummary?.outputCount === 1 ? '' : 's'}`}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link href={`${productRunLink(productRun)}/outputs`}>
                      Open <ArrowUpRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              {/* <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Data range: {formatDate(product?.outputSummary?.startTime)} to{' '}
              {formatDate(product?.outputSummary?.endTime)}
            </div>
            <div className="text-muted-foreground">
              {product?.outputSummary?.outputCount} outputs
            </div>
          </CardFooter> */}
            </Card>
          )}
          {productRun?.datasetRun && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Dataset Run</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {productRun?.datasetRun?.dataset?.name}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link href={datasetLink(productRun?.datasetRun?.dataset)}>
                      Open <ArrowUpRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Run on: {formatDateTime(productRun?.datasetRun?.createdAt)}
                </div>
                <div className="text-muted-foreground font-mono">
                  {productRun?.datasetRun?.id}
                </div>
              </CardFooter>
            </Card>
          )}
          {productRun?.geometriesRun && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Geometries Run</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {productRun?.geometriesRun?.geometries?.name}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link
                      href={geometriesLink(
                        productRun?.geometriesRun?.geometries,
                      )}
                    >
                      Open <ArrowUpRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Run on: {formatDateTime(productRun?.geometriesRun?.createdAt)}
                </div>
                <div className="text-muted-foreground font-mono">
                  {productRun?.geometriesRun?.id}
                </div>
              </CardFooter>
            </Card>
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
