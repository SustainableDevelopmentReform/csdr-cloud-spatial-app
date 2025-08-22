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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { MainRunBadge } from '../../../../_components/main-run-badge'
import { DatasetRunSummaryCard } from '../../../_components/dataset-run-summary-card'
import {
  useDataset,
  useDatasetLink,
  useDatasetRun,
  useDeleteDatasetRun,
  useUpdateDatasetRun,
} from '../../../_hooks'
import { DetailCard } from '../../../../_components/detail-cards'
import { pluralize } from '@repo/ui/lib/utils'
import { useProductRunsLink } from '../../../../products/_hooks'
import { ArrowUpRightIcon } from 'lucide-react'

const formSchema = z.object({
  id: z.string().readonly(),
  description: z.string().nullable().optional(),
  parameters: z.any().optional().readonly(),
})

type Data = z.infer<typeof formSchema>

const DatasetRunDetails = () => {
  const { data: datasetRun } = useDatasetRun()
  const updateDatasetRun = useUpdateDatasetRun()
  const deleteDatasetRun = useDeleteDatasetRun('/console/datasetRuns')
  const { data: dataset } = useDataset()
  const datasetLink = useDatasetLink()
  const productRunsLink = useProductRunsLink()
  const form = useForm<Data>({
    defaultValues: {
      description: '',
    },
    resolver: zodResolver(formSchema),
  })

  const { control, handleSubmit } = form

  useEffect(() => {
    if (!datasetRun) return
    form.reset(datasetRun)
  }, [datasetRun])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium flex items-center gap-2">
        DatasetRun Details
        {dataset?.mainRun && datasetRun?.id === dataset?.mainRun?.id && (
          <MainRunBadge variant="dataset" />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard dataset={dataset} datasetRun={datasetRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {datasetRun && (
            <DetailCard
              title={`${datasetRun?.productRunCount} ${pluralize(datasetRun?.productRunCount, 'product', 'products')}`}
              description="Products Runs"
              actionText="Open"
              actionLink={productRunsLink(null, {
                datasetRunId: datasetRun?.id,
              })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
        </div>
      </div>

      <Form {...form}>
        <form
          className="grid gap-3 border-b border-gray-200 pb-8"
          onSubmit={handleSubmit((data) => updateDatasetRun.mutate(data))}
        >
          <FormItem>
            <FormLabel>DatasetRun ID</FormLabel>
            <Input
              disabled
              value={datasetRun?.id ?? ''}
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
            <Button className="mt-4" disabled={updateDatasetRun.isPending}>
              {updateDatasetRun.isPending ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 border-b border-gray-200 pb-8">
        <div className="text-xl mb-6 font-medium">DatasetRun actions</div>
        <div className="mb-6">
          <div className="font-medium">Delete datasetRun</div>
          <div className="mb-3">
            Permanently remove the datasetRun, including all datasetRun runs.
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete datasetRun</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  {datasetRun?.dataset?.name} datasetRun and remove{' '}
                  {datasetRun?.dataset?.name} data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    datasetRun && deleteDatasetRun.mutate(datasetRun)
                  }
                >
                  {match(deleteDatasetRun)
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

export default DatasetRunDetails
