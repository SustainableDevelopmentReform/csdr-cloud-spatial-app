'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateVariableSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { useDeleteVariable, useUpdateVariable, useVariable } from '../_hooks'

const VariableDetails = () => {
  const { data: variable } = useVariable()
  const updateVariable = useUpdateVariable()
  const deleteVariable = useDeleteVariable(undefined, '/console/variables')

  const form = useForm({
    resolver: zodResolver(updateVariableSchema),
  })

  useEffect(() => {
    if (variable) {
      form.reset(variable)
    }
  }, [variable, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <CrudForm
        form={form}
        mutation={updateVariable}
        deleteMutation={deleteVariable}
        entityName="Variable"
        entityNamePlural="variables"
        successMessage="Updated Variable"
      ></CrudForm>
    </div>
  )
}

export default VariableDetails
