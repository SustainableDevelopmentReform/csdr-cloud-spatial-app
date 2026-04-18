'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ConsoleCrudListFrame } from '../../_components/console-crud-list-frame'
import { useApiKeys } from '../_hooks'
import ApiKeysForm from './_components/form'
import ApiKeysTable from './_components/table'

const UserFeature = () => {
  const { data: apiKeys, isOpen, setOpen } = useApiKeys()

  return (
    <div className="flex flex-col gap-6">
      <ConsoleCrudListFrame
        title="API Keys"
        description="Create and manage API keys for your account."
        actions={
          <ApiKeysForm
            key={`add-api-key-form-${isOpen}`}
            isOpen={isOpen}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
          >
            <Button>Add API key</Button>
          </ApiKeysForm>
        }
      >
        <ApiKeysTable data={apiKeys?.apiKeys ?? []} />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default UserFeature
