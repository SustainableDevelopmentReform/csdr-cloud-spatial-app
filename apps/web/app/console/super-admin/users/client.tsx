'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { Search } from 'lucide-react'
import Pagination from '~/components/table/pagination'
import { ConsoleCrudListFrame } from '~/app/console/_components/console-crud-list-frame'
import {
  formatGlobalUserRole,
  globalUserRoleSchema,
} from '~/utils/access-control'
import UserForm from './_components/form'
import UsersTable from './_components/table'
import { useUsers } from './_hooks'

const UserFeature = () => {
  const {
    data,
    isOpen,
    setOpen,
    setSearch,
    role,
    setRole,
    sort,
    setSort,
    order,
    setOrder,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsers()

  return (
    <div className="flex flex-col gap-6">
      <ConsoleCrudListFrame
        title="Users"
        description={`${data?.total ?? 0} users in the system.`}
        actions={
          <UserForm
            key={`add-organization-form-${isOpen}`}
            isOpen={isOpen}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
          >
            <Button>Add user</Button>
          </UserForm>
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const elements = new FormData(e.currentTarget)
                setSearch(elements.get('search')?.toString() ?? '')
              }}
              className="relative w-full max-w-sm"
            >
              <Search className="absolute left-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-600" />
              <Input name="search" className="pl-8" placeholder="Search" />
            </form>
            <Select
              value={role ?? 'all'}
              onValueChange={(value) => {
                const parsedRole = globalUserRoleSchema.safeParse(value)

                setRole(parsedRole.success ? parsedRole.data : undefined)
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {globalUserRoleSchema.options.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {formatGlobalUserRole(roleOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.users.length}
            totalCount={data?.total}
            onLoadMore={() => fetchNextPage()}
          />
        }
      >
        <UsersTable
          data={data?.users || []}
          sort={sort}
          order={order}
          onSortChange={(nextSort, nextOrder) => {
            setSort(nextSort)
            setOrder(nextOrder)
          }}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default UserFeature
