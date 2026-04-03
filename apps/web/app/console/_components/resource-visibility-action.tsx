'use client'

import Link from 'next/link'
import { visibilitySchema } from '@repo/schemas/crud'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
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
import { z } from 'zod'
import { CrudFormAction } from '~/components/form/crud-form-action'
import {
  DASHBOARDS_BASE_PATH,
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  INDICATORS_DERIVED_BASE_PATH,
  INDICATORS_MEASURED_BASE_PATH,
  PRODUCTS_BASE_PATH,
  REPORTS_BASE_PATH,
} from '~/lib/paths'
import {
  canChangeConsoleResourceVisibility,
  formatVisibility,
  getConsoleResourceVisibilityDescription,
  getConsoleResourceVisibilityOptions,
  ResourceVisibility,
  SessionAccess,
  VisibilityImpact,
  VisibilityImpactEntry,
  VisibilityImpactExternalCount,
  VisibilityImpactResource,
  VisibilityImpactResourceType,
  visibilityImpactResourceSchema,
} from '~/utils/access-control'
import { toastError } from '~/utils/error-handling'

type VisibilityMutation = UseMutationResult<
  unknown,
  Error,
  { visibility: ResourceVisibility }
>

type VisibilityPreviewMutation = UseMutationResult<
  VisibilityImpact | null,
  Error,
  { visibility: ResourceVisibility }
>

type ResourceVisibilityActionProps = {
  access: SessionAccess
  mutation: VisibilityMutation
  previewMutation: VisibilityPreviewMutation
  resourceData: unknown
  successMessage: string
  visibility: ResourceVisibility
}

const visibilityImpactErrorSchema = z.object({
  message: z.string(),
  description: z.string().nullable().optional(),
  data: z.object({
    dependencies: z.array(visibilityImpactResourceSchema),
  }),
})

export type VisibilityImpactDialogState = {
  description: string
  impact: VisibilityImpact
  title: string
}

export const getVisibilityImpactDialogStateFromError = (
  error: unknown,
): VisibilityImpactDialogState | null => {
  const visibilityImpactError = visibilityImpactErrorSchema.safeParse(error)

  if (!visibilityImpactError.success) {
    return null
  }

  return {
    title: visibilityImpactError.data.message,
    description:
      visibilityImpactError.data.description ??
      'This change is blocked by private dependencies.',
    impact: {
      canApply: false,
      blockingIssues: [
        {
          code: 'private_upstream_dependencies',
          message:
            visibilityImpactError.data.description ?? 'This change is blocked.',
          resources: visibilityImpactError.data.data.dependencies,
          externalCounts: [],
        },
      ],
      warnings: [],
    },
  }
}

export const handleVisibilityImpactError = (input: {
  error: unknown
  fallbackMessage: string
  setDialogState: (state: VisibilityImpactDialogState | null) => void
}): void => {
  const dialogState = getVisibilityImpactDialogStateFromError(input.error)

  if (dialogState) {
    input.setDialogState(dialogState)
    return
  }

  toastError(input.error, input.fallbackMessage)
}

const getVisibilityChangeSummary = (visibility: ResourceVisibility): string => {
  switch (visibility) {
    case 'private':
      return 'This will keep the resource inside its organization and may break externally visible dependents.'
    case 'public':
      return 'This will make the resource readable to anyone, but it will not be listed across organizations or in the public explorer.'
    case 'global':
      return 'This will make the resource readable to anyone and list it across organizations and in the public explorer.'
    default:
      return visibility
  }
}

const formatResourceType = (
  resourceType: VisibilityImpactResourceType,
): string => {
  switch (resourceType) {
    case 'dataset':
      return 'Dataset'
    case 'geometries':
      return 'Geometries'
    case 'product':
      return 'Product'
    case 'indicator':
      return 'Indicator'
    case 'derivedIndicator':
      return 'Derived indicator'
    case 'report':
      return 'Report'
    case 'dashboard':
      return 'Dashboard'
    default:
      return resourceType
  }
}

const formatExternalCount = (
  externalCount: VisibilityImpactExternalCount,
): string => {
  const label = formatResourceType(externalCount.resourceType).toLowerCase()
  const pluralizedLabel = externalCount.count === 1 ? label : `${label}s`

  return `${externalCount.count} ${pluralizedLabel} in other organizations`
}

const getResourceHref = (resource: VisibilityImpactResource): string => {
  switch (resource.resourceType) {
    case 'dataset':
      return `${DATASETS_BASE_PATH}/${resource.id}`
    case 'geometries':
      return `${GEOMETRIES_BASE_PATH}/${resource.id}`
    case 'product':
      return `${PRODUCTS_BASE_PATH}/${resource.id}`
    case 'indicator':
      return `${INDICATORS_MEASURED_BASE_PATH}/${resource.id}`
    case 'derivedIndicator':
      return `${INDICATORS_DERIVED_BASE_PATH}/${resource.id}`
    case 'report':
      return `${REPORTS_BASE_PATH}/${resource.id}`
    case 'dashboard':
      return `${DASHBOARDS_BASE_PATH}/${resource.id}`
    default:
      return PRODUCTS_BASE_PATH
  }
}

const VisibilityImpactList = ({ entry }: { entry: VisibilityImpactEntry }) => {
  if (entry.resources.length === 0 && entry.externalCounts.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
      <p>{entry.message}</p>
      {entry.resources.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entry.resources.map((resource) => (
            <li key={`${resource.resourceType}-${resource.id}`}>
              <Link
                className="underline underline-offset-4"
                href={getResourceHref(resource)}
              >
                {formatResourceType(resource.resourceType)}: {resource.name}
              </Link>{' '}
              <span className="text-muted-foreground">
                ({formatVisibility(resource.visibility)})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {entry.externalCounts.length > 0 ? (
        <ul className="mt-3 space-y-1 text-muted-foreground">
          {entry.externalCounts.map((externalCount) => (
            <li key={externalCount.resourceType}>
              {formatExternalCount(externalCount)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export const VisibilityImpactDialog = ({
  closeLabel = 'Cancel',
  confirmDisabled = false,
  confirmLabel = 'Confirm',
  confirmLoading = false,
  description,
  impact,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  closeLabel?: string
  confirmDisabled?: boolean
  confirmLabel?: string
  confirmLoading?: boolean
  description: string
  impact: VisibilityImpact | null
  onConfirm?: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}) => {
  const blockingIssues = impact?.blockingIssues ?? []
  const warnings = impact?.warnings ?? []

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {blockingIssues.map((entry) => (
            <VisibilityImpactList
              key={`${entry.code}-${entry.message}`}
              entry={entry}
            />
          ))}
          {warnings.map((entry) => (
            <VisibilityImpactList
              key={`${entry.code}-${entry.message}`}
              entry={entry}
            />
          ))}
          {blockingIssues.length === 0 && warnings.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              No dependency issues were found for this change.
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{closeLabel}</AlertDialogCancel>
          {onConfirm ? (
            <AlertDialogAction
              disabled={confirmDisabled || confirmLoading}
              onClick={(event) => {
                event.preventDefault()
                if (confirmDisabled) {
                  return
                }

                onConfirm()
              }}
            >
              {confirmLoading ? 'Loading...' : confirmLabel}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ResourceVisibilityAction = ({
  access,
  mutation,
  previewMutation,
  resourceData,
  successMessage,
  visibility,
}: ResourceVisibilityActionProps) => {
  const [nextVisibility, setNextVisibility] =
    useState<ResourceVisibility>(visibility)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [impact, setImpact] = useState<VisibilityImpact | null>(null)

  useEffect(() => {
    setNextVisibility(visibility)
  }, [visibility])

  const options = getConsoleResourceVisibilityOptions({
    access,
    currentVisibility: visibility,
    resourceData,
  })
  const canChange = canChangeConsoleResourceVisibility({
    access,
    currentVisibility: visibility,
    resourceData,
  })

  if (options.length === 0) {
    return null
  }

  const openPreviewDialog = async () => {
    const preview = await previewMutation
      .mutateAsync({
        visibility: nextVisibility,
      })
      .catch(() => undefined)

    if (!preview) {
      toast.error('Failed to preview visibility change')
      return
    }

    setImpact(preview)
    setDialogOpen(true)
  }

  const confirmVisibilityChange = () => {
    mutation.mutate(
      { visibility: nextVisibility },
      {
        onSuccess: () => {
          toast.success(successMessage)
          setDialogOpen(false)
        },
      },
    )
  }

  const blockingIssues = impact?.blockingIssues ?? []

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          disabled={
            !canChange || mutation.isPending || previewMutation.isPending
          }
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
            disabled={
              mutation.isPending ||
              previewMutation.isPending ||
              nextVisibility === visibility
            }
            onClick={openPreviewDialog}
            type="button"
          >
            {previewMutation.isPending ? 'Loading...' : 'Update visibility'}
          </Button>
        ) : null}
      </div>

      <VisibilityImpactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Change visibility to ${formatVisibility(nextVisibility)}`}
        description={getVisibilityChangeSummary(nextVisibility)}
        impact={impact}
        closeLabel="Cancel"
        confirmLabel="Confirm"
        confirmDisabled={!impact?.canApply}
        confirmLoading={mutation.isPending}
        onConfirm={confirmVisibilityChange}
      />
    </>
  )
}

export const createResourceVisibilityAction = (input: {
  access: SessionAccess
  mutation: VisibilityMutation
  previewMutation: VisibilityPreviewMutation
  resourceData: unknown
  successMessage: string
  visibility: ResourceVisibility
}): CrudFormAction | null => {
  const options = getConsoleResourceVisibilityOptions({
    access: input.access,
    currentVisibility: input.visibility,
    resourceData: input.resourceData,
  })

  if (options.length === 0) {
    return null
  }

  return {
    title: 'Visibility',
    description: getConsoleResourceVisibilityDescription({
      access: input.access,
      currentVisibility: input.visibility,
      resourceData: input.resourceData,
    }),
    component: <ResourceVisibilityAction {...input} />,
  }
}
