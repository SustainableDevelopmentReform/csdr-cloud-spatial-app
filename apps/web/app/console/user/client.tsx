'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Search } from 'lucide-react'
import Pagination from '~/components/table/pagination'
import UserForm from './_components/form'
import UsersTable from './_components/table'
import { useUsers } from './_hooks'

const UserFeature = () => {
  const {
    data,
    isOpen,
    setOpen,
    setSearch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsers()

  return (
    <div>
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
      <div>
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
        </div>
        <UsersTable data={data?.users || []} />
        <Pagination
          className="justify-end mt-4"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default UserFeature
