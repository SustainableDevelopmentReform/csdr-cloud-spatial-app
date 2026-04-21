'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { toast } from '@repo/ui/components/ui/sonner'
import { useState } from 'react'
import { ConsoleCrudListFrame } from '~/app/console/_components/console-crud-list-frame'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '~/app/console/_components/console-simple-breadcrumbs'
import { useAccessControl } from '~/hooks/useAccessControl'
import {
  useAdminOrganizations,
  useCreateOrganization,
} from '../../workspace/_hooks'

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const SuperAdminOrganizationsPageClient = () => {
  const { organizations } = useAccessControl()
  const adminOrganizations = useAdminOrganizations()
  const createOrganization = useCreateOrganization()
  const [organizationName, setOrganizationName] = useState('')
  const [organizationSlug, setOrganizationSlug] = useState('')

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs
            items={[
              { href: '/console', label: 'Home' },
              { label: 'Organizations' },
            ]}
          />
        }
      />
      <ConsoleCrudListFrame
        title="Organizations"
        description={`${adminOrganizations.data?.length ?? 0} organizations in the system.`}
        toolbar={
          <div className="grid max-w-md gap-3">
            <Input
              placeholder="Organization name"
              value={organizationName}
              onChange={(event) => {
                const nextName = event.target.value
                setOrganizationName(nextName)
                if (organizationSlug.trim() === '') {
                  setOrganizationSlug(slugify(nextName))
                }
              }}
            />
            <Input
              placeholder="organization-slug"
              value={organizationSlug}
              onChange={(event) =>
                setOrganizationSlug(slugify(event.target.value))
              }
            />
            <Button
              className="w-fit"
              disabled={
                createOrganization.isPending ||
                organizationName.trim() === '' ||
                organizationSlug.trim() === ''
              }
              onClick={() => {
                createOrganization.mutate(
                  {
                    name: organizationName.trim(),
                    slug: organizationSlug.trim(),
                  },
                  {
                    onSuccess: async () => {
                      setOrganizationName('')
                      setOrganizationSlug('')
                      toast.success('Organization created')
                      await Promise.all([
                        adminOrganizations.refetch(),
                        organizations.refetch(),
                      ])
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            >
              {createOrganization.isPending
                ? 'Creating...'
                : 'Create organization'}
            </Button>
          </div>
        }
      >
        {adminOrganizations.isLoading ? (
          <div className="text-sm text-gray-500">Loading organizations...</div>
        ) : adminOrganizations.data && adminOrganizations.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Members</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {adminOrganizations.data.map((organization) => (
                  <tr
                    key={organization.id}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-2">{organization.name}</td>
                    <td className="px-3 py-2">
                      <code>{organization.slug}</code>
                    </td>
                    <td className="px-3 py-2">{organization.memberCount}</td>
                    <td className="px-3 py-2">
                      {new Date(organization.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No organizations found.</div>
        )}
      </ConsoleCrudListFrame>
    </div>
  )
}

export default SuperAdminOrganizationsPageClient
