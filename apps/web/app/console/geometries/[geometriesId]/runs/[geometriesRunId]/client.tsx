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
import { useGeometriesLink } from '../../../_hooks'
import { GeometriesRunSummaryCard } from '../../../_components/geometries-run-summary-card'
import {
  useDeleteGeometriesRun,
  useGeometries,
  useGeometriesRun,
  useGeometriesRunLink,
  useUpdateGeometriesRun,
} from '../../../_hooks'
import { useProductRunsLink } from '../../../../products/_hooks'

const formSchema = z.object({
  id: z.string().readonly(),
  description: z.string().nullable().optional(),
  parameters: z.any().optional().readonly(),
})

type Data = z.infer<typeof formSchema>

const GeometriesRunDetails = () => {
  const { data: geometriesRun } = useGeometriesRun()
  const updateGeometriesRun = useUpdateGeometriesRun()
  const deleteGeometriesRun = useDeleteGeometriesRun('/console/geometriesRuns')
  const geometriesRunLink = useGeometriesRunLink()
  const datasetRunLink = useDatasetRunLink()
  const geometriesLink = useGeometriesLink()
  const productRunsLink = useProductRunsLink()
  const { data: geometries } = useGeometries()
  const form = useForm<Data>({
    defaultValues: {
      description: '',
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = form

  useEffect(() => {
    if (!geometriesRun) return
    form.reset(geometriesRun)
  }, [geometriesRun])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium flex items-center gap-2">
        GeometriesRun Details
        {geometries?.mainRun &&
          geometriesRun?.id === geometries?.mainRun?.id && (
            <MainRunBadge variant="geometries" />
          )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeometriesRunSummaryCard
          geometries={geometries}
          geometriesRun={geometriesRun}
        />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {geometriesRun && (
            <DetailCard
              title={`${geometriesRun?.outputCount} ${pluralize(geometriesRun?.outputCount, 'output', 'outputs')}`}
              description="Outputs"
              actionText="Open"
              actionLink={`${geometriesRunLink(geometriesRun)}/outputs`}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {geometriesRun && (
            <DetailCard
              title={`${geometriesRun?.productRunCount} ${pluralize(geometriesRun?.productRunCount, 'product', 'products')}`}
              description="Products Runs"
              actionText="Open"
              actionLink={productRunsLink(null, {
                geometriesRunId: geometriesRun?.id,
              })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
        </div>
      </div>

      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((data) => updateGeometriesRun.mutate(data))}
        >
          <FormItem>
            <FormLabel>GeometriesRun ID</FormLabel>
            <Input
              disabled
              value={geometriesRun?.id ?? ''}
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
            <Button className="mt-4" disabled={updateGeometriesRun.isPending}>
              {updateGeometriesRun.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">GeometriesRun actions</div>
        <div className="mb-6">
          <div className="font-medium">Delete geometriesRun</div>
          <div className="mb-3">
            Permanently remove the geometriesRun, including all geometriesRun
            runs.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete geometriesRun</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {geometriesRun?.geometries?.name} geometriesRun and remove{' '}
                  {geometriesRun?.geometries?.name} data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    geometriesRun && deleteGeometriesRun.mutate(geometriesRun)
                  }
                >
                  {match(deleteGeometriesRun)
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

export default GeometriesRunDetails
