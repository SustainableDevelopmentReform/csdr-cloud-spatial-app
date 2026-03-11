'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useApiKeys } from '../_hooks'
import ApiKeysForm from './_components/form'
import ApiKeysTable from './_components/table'

const UserFeature = () => {
  const { data: apiKeys, isOpen, setOpen } = useApiKeys()

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">API Keys</h1>
        <ApiKeysForm
          key={`add-api-key-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add API key</Button>
        </ApiKeysForm>
      </div>
      <div className="mt-8">
        <ApiKeysTable data={apiKeys?.apiKeys ?? []} />
      </div>
    </div>
  )
}

export default UserFeature
