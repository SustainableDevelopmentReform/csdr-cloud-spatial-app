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
import Link from '../../../../components/link'
import { useDatasetLink } from '../../datasets/_hooks'
import { useGeometriesLink } from '../../geometries/_hooks'
import { ProductRunSummaryCard } from '../_components/product-run-summary-card'
import {
  useDeleteProduct,
  useProduct,
  useProductLink,
  useProductRunLink,
  useUpdateProduct,
} from '../_hooks'

const formSchema = z.object({
  id: z.string().readonly(),
  name: z.string().readonly(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional().readonly(),
})

type Data = z.infer<typeof formSchema>

const ProductDetails = () => {
  const { data: product } = useProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct('/console/products')
  const productLink = useProductLink()
  const productRunLink = useProductRunLink()
  const datasetLink = useDatasetLink()
  const geometriesLink = useGeometriesLink()
  const form = useForm<Data>({
    defaultValues: {
      id: '',
      name: '',
      description: '',
      metadata: {},
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = form

  useEffect(() => {
    if (!product) return
    form.reset(product)
  }, [product])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium">Product Details</div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {product && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Product Runs</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {`${product?.runCount} run${product?.runCount === 1 ? '' : 's'}`}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link href={`${productLink(product)}/runs`}>
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
          {product?.dataset && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Dataset</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {product?.dataset?.name}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link href={datasetLink(product?.dataset)}>
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
          {product?.geometries && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Geometries</CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {product?.geometries?.name}
                </CardTitle>
                <CardAction>
                  <Button size="sm" asChild>
                    <Link href={geometriesLink(product?.geometries)}>
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
        </div>
      </div>

      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((data) => updateProduct.mutate(data))}
        >
          <FormItem>
            <FormLabel>Product ID</FormLabel>
            <Input disabled value={product?.id ?? ''} className="bg-gray-100" />
          </FormItem>

          <FormItem>
            <FormLabel>Product Name</FormLabel>
            <Input
              disabled
              value={product?.name ?? ''}
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
            name="metadata"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metadata</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="font-mono"
                    disabled
                    value={JSON.stringify(field.value, null, 2)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button className="mt-4" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">Product actions</div>
        <div className="mb-6">
          <div className="font-medium">Delete product</div>
          <div className="mb-3">
            Permanently remove the product, including all product runs.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete product</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {product?.name} product and remove {product?.name} data from
                  our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => product && deleteProduct.mutate(product)}
                >
                  {match(deleteProduct)
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

export default ProductDetails
