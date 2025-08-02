'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import Pagination from '~/components/pagination'
import { QueryKey } from '~/utils/fetcher'
import { authClient } from '../../../utils/auth'
import AdminLayout from '../_components/admin-layout'
import UserForm from './_components/form'
import UsersTable from './_components/table'

const UserFeature = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState('')
  // const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
  //   undefined,
  // )

  const { data } = useQuery({
    queryKey: [QueryKey.Users, page, search],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          searchValue: search,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          // organizationId: selectedOrgId,
        },
      })

      if (res.error) {
        throw new Error(res.error.message)
      }

      return res.data
    },
    placeholderData: keepPreviousData,
  })

  // const { data: organizations } = useGetAllOrganizations()

  return (
    <AdminLayout>
      <div className="p-10">
        <div className="flex justify-between">
          <h1 className="text-3xl font-medium mb-2">
            Users ({data?.total ?? 0})
          </h1>
          <UserForm
            key={`add-organization-form-${isOpen}`}
            isOpen={isOpen}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
          >
            <Button>Add user</Button>
          </UserForm>
        </div>
        <div className="mt-8">
          <div className="flex items-center mb-4 gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const elements = new FormData(e.currentTarget)
                setSearch(elements.get('search')?.toString() ?? '')
              }}
              className="max-w-sm relative w-full"
            >
              <Search className="absolute top-1/2 -translate-y-1/2 left-2 w-[18px] h-[18px] text-gray-600" />
              <Input name="search" className="pl-8" placeholder="Search" />
            </form>
            {/* <Select
              value={
                selectedOrgId ??
                organizations?.find((org) => org.isDefault)?.id?.toString()
              }
              onValueChange={setSelectedOrgId}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem
                    key={`select-org-${org.id}`}
                    value={org.id.toString()}
                  >
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
          </div>
          <UsersTable data={data?.users || []} />
          <Pagination
            className="justify-end mt-4"
            totalPages={Math.ceil((data?.total ?? 0) / pageSize)}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </AdminLayout>
  )
}

export default UserFeature
