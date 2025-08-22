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
import { DetailCard } from '../../_components/detail-cards'
import { GeometriesRunSummaryCard } from '../_components/geometries-run-summary-card'
import {
  useGeometries,
  useGeometriesLink,
  useDeleteGeometries,
  useUpdateGeometries,
  useGeometriesRunsLink,
} from '../_hooks'
import { useProductsLink } from '../../products/_hooks'

const formSchema = z.object({
  id: z.string().readonly(),
  name: z.string(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

type Data = z.infer<typeof formSchema>

const GeometriesDetails = () => {
  const { data: geometries } = useGeometries()
  const productsLink = useProductsLink()
  const updateGeometries = useUpdateGeometries()
  const deleteGeometries = useDeleteGeometries('/console/geometries')
  const geometriesLink = useGeometriesLink()
  const geometriesRunsLink = useGeometriesRunsLink()
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
    if (!geometries) return
    form.reset(geometries)
  }, [geometries])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium mb-8">Geometries Details</div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeometriesRunSummaryCard geometries={geometries} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {geometries && (
            <DetailCard
              title={`${geometries?.runCount} ${pluralize(geometries?.runCount, 'run', 'runs')}`}
              description="Geometries Runs"
              actionText="Open"
              actionLink={geometriesRunsLink(geometries)}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {geometries && (
            <DetailCard
              title={`${geometries?.productCount} ${pluralize(geometries?.productCount, 'product', 'products')}`}
              description="Products"
              actionText="Open"
              actionLink={productsLink({ geometriesId: geometries.id })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
        </div>
      </div>
      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((data) => updateGeometries.mutate(data))}
        >
          <FormItem>
            <FormLabel>Geometries ID</FormLabel>
            <Input
              disabled
              value={geometries?.id ?? ''}
              className="bg-gray-100"
            />
          </FormItem>

          <FormItem>
            <FormLabel>Geometries Name</FormLabel>
            <Input
              disabled
              value={geometries?.name ?? ''}
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
            <Button className="mt-4" disabled={updateGeometries.isPending}>
              {updateGeometries.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">Geometries actions</div>
        <div className="mb-6">
          <div className="font-medium">Delete geometries</div>
          <div className="mb-3">
            Permanently remove the geometries, including all geometries runs.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete geometries</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {geometries?.name} geometries and remove {geometries?.name}{' '}
                  data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    geometries && deleteGeometries.mutate(geometries)
                  }
                >
                  {match(deleteGeometries)
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

export default GeometriesDetails
