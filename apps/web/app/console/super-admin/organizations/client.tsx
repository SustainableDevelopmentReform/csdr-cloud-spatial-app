'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { ConsoleCrudListFrame } from '~/app/console/_components/console-crud-list-frame'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '~/app/console/_components/console-simple-breadcrumbs'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import Table from '~/components/table/table'
import { useAccessControl } from '~/hooks/useAccessControl'
import {
  useAdminOrganizations,
  useCreateOrganization,
} from '../../workspace/_hooks'

type AdminOrganization = NonNullable<
  ReturnType<typeof useAdminOrganizations>['data']
>[number]

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

const CreateOrganizationAction = ({
  onCreated,
}: {
  onCreated: () => Promise<void>
}) => {
  const createOrganization = useCreateOrganization()
  const form = useForm<z.infer<typeof createOrganizationFormSchema>>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createOrganization}
      buttonText="Add Organization"
      entityName="Organization"
      entityNamePlural="organizations"
      hiddenFields={['id', 'name', 'description', 'metadata']}
      onClose={() => form.reset()}
      onSuccess={() => {
        form.reset()
        void onCreated()
      }}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Organization name"
                {...field}
                value={field.value}
                onChange={(event) => {
                  const nextName = event.target.value
                  field.onChange(nextName)
                  if (form.getValues('slug').trim() === '') {
                    form.setValue('slug', slugify(nextName), {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl>
              <Input
                placeholder="organization-slug"
                {...field}
                value={field.value}
                onChange={(event) => {
                  field.onChange(slugify(event.target.value))
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

const OrganizationsTable = ({
  data,
  isLoading,
}: {
  data: AdminOrganization[]
  isLoading: boolean
}) => {
  const columns = useMemo<ColumnDef<AdminOrganization>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (organization) => organization.name,
        header: () => <span>Name</span>,
        cell: (info) => info.row.original.name,
        minSize: 220,
      },
      {
        id: 'slug',
        accessorFn: (organization) => organization.slug,
        header: () => <span>Slug</span>,
        cell: (info) => <code>{info.row.original.slug}</code>,
        size: 180,
      },
      {
        id: 'members',
        accessorFn: (organization) => organization.memberCount,
        header: () => <span>Members</span>,
        cell: (info) => info.row.original.memberCount,
        size: 120,
      },
      {
        id: 'createdAt',
        accessorFn: (organization) => organization.createdAt,
        header: () => <span>Created</span>,
        cell: (info) => new Date(info.row.original.createdAt).toLocaleString(),
        size: 180,
      },
    ],
    [],
  )
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table
      table={table}
      isLoading={isLoading}
      emptyStateLabel="No organizations found."
      loadingStateLabel="Loading organizations..."
    />
  )
}

const SuperAdminOrganizationsPageClient = () => {
  const { organizations } = useAccessControl()
  const adminOrganizations = useAdminOrganizations()

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs items={[{ label: 'Organizations' }]} />
        }
      />
      <ConsoleCrudListFrame
        title="Organizations"
        description={`${adminOrganizations.data?.length ?? 0} organizations in the system.`}
        actions={
          <CreateOrganizationAction
            onCreated={async () => {
              await Promise.all([
                adminOrganizations.refetch(),
                organizations.refetch(),
              ])
            }}
          />
        }
      >
        <OrganizationsTable
          data={adminOrganizations.data ?? []}
          isLoading={adminOrganizations.isLoading}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default SuperAdminOrganizationsPageClient
