'use client'

import { visibilitySchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { UseMutationResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  canChangeConsoleResourceVisibility,
  formatVisibility,
  getConsoleResourceVisibilityDescription,
  getConsoleResourceVisibilityOptions,
  ResourceVisibility,
  SessionAccess,
} from '~/utils/access-control'
import { CrudFormAction } from '~/components/form/crud-form-action'

type ResourceVisibilityActionProps = {
  access: SessionAccess
  mutation: UseMutationResult<
    unknown,
    Error,
    { visibility: ResourceVisibility }
  >
  successMessage: string
  visibility: ResourceVisibility
}

const ResourceVisibilityAction = ({
  access,
  mutation,
  successMessage,
  visibility,
}: ResourceVisibilityActionProps) => {
  const [nextVisibility, setNextVisibility] =
    useState<ResourceVisibility>(visibility)

  useEffect(() => {
    setNextVisibility(visibility)
  }, [visibility])

  const options = getConsoleResourceVisibilityOptions(access, visibility)
  const canChange = canChangeConsoleResourceVisibility(access, visibility)

  if (options.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        disabled={!canChange || mutation.isPending}
        value={nextVisibility}
        onValueChange={(value) => {
          setNextVisibility(visibilitySchema.parse(value))
        }}
      >
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Select visibility" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {formatVisibility(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canChange ? (
        <Button
          disabled={mutation.isPending || nextVisibility === visibility}
          onClick={() => {
            mutation.mutate(
              { visibility: nextVisibility },
              {
                onSuccess: () => {
                  toast.success(successMessage)
                },
              },
            )
          }}
          type="button"
        >
          {mutation.isPending ? 'Loading...' : 'Update visibility'}
        </Button>
      ) : null}
    </div>
  )
}

export const createResourceVisibilityAction = (input: {
  access: SessionAccess
  mutation: UseMutationResult<
    unknown,
    Error,
    { visibility: ResourceVisibility }
  >
  successMessage: string
  visibility: ResourceVisibility
}): CrudFormAction | null => {
  const options = getConsoleResourceVisibilityOptions(
    input.access,
    input.visibility,
  )

  if (options.length === 0) {
    return null
  }

  return {
    title: 'Visibility',
    description: getConsoleResourceVisibilityDescription(
      input.access,
      input.visibility,
    ),
    component: <ResourceVisibilityAction {...input} />,
  }
}
