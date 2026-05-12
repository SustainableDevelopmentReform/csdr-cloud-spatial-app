'use client'

import { visibilitySchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import { cn } from '@repo/ui/lib/utils'
import { Loader2, Pencil, Save, Share2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from '~/components/link'
import {
  formatVisibility,
  type ResourceVisibility,
} from '~/utils/access-control'
import { toastError } from '~/utils/error-handling'
import { ResourceVisibilityIcon } from './resource-visibility-icon'

type ResourceHeaderActionsProps = {
  canEdit: boolean
  editHref: string
  formId: string
  isEditMode: boolean
  onDiscard: () => void
  resourcePath: string
  resourceTypeLabel: string
  savePending: boolean
}

export const getEditModeHref = (resourcePath: string) => {
  const separator = resourcePath.includes('?') ? '&' : '?'
  return `${resourcePath}${separator}mode=edit`
}

export function ResourceHeaderActions({
  canEdit,
  editHref,
  formId,
  isEditMode,
  onDiscard,
  resourcePath,
  resourceTypeLabel,
  savePending,
}: ResourceHeaderActionsProps) {
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (!shareCopied) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShareCopied(false)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [shareCopied])

  const copyShareLink = useCallback(async () => {
    const canonicalUrl = `${window.location.origin}${resourcePath}`

    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setShareCopied(true)
      toast.success(`${resourceTypeLabel} link copied`)
    } catch (error) {
      toastError(
        error,
        `Failed to copy ${resourceTypeLabel.toLowerCase()} link`,
      )
    }
  }, [resourcePath, resourceTypeLabel])

  return (
    <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
      {!isEditMode && canEdit ? (
        <Button asChild type="button" variant="outline">
          <Link href={editHref}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      ) : null}
      {isEditMode ? (
        <>
          <Button
            disabled={savePending}
            onClick={onDiscard}
            type="button"
            variant="ghost"
          >
            <Undo2 className="h-4 w-4" />
            Discard Edits
          </Button>
          <Button disabled={savePending} form={formId} type="submit">
            {savePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={copyShareLink} type="button">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {shareCopied
              ? 'Copied'
              : `Copy ${resourceTypeLabel.toLowerCase()} link`}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export function ResourceVisibilitySelect({
  canChange,
  className,
  currentVisibility,
  disabled,
  isPending,
  onPreviewChange,
  options,
}: {
  canChange: boolean
  className?: string
  currentVisibility: ResourceVisibility
  disabled?: boolean
  isPending?: boolean
  onPreviewChange: (visibility: ResourceVisibility) => void
  options: ResourceVisibility[]
}) {
  const triggerClassName = cn(
    'm-0 h-9 min-h-9 w-fit justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium leading-5 text-foreground shadow-xs [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:opacity-100',
    className,
  )

  if (options.length === 0) {
    return (
      <div className={triggerClassName}>
        <ResourceVisibilityIcon
          className="h-4 w-4"
          visibility={currentVisibility}
        />
        Visibility: {formatVisibility(currentVisibility)}
      </div>
    )
  }

  return (
    <Select
      disabled={!canChange || disabled || isPending}
      value={currentVisibility}
      onValueChange={(value) => {
        const parsedVisibility = visibilitySchema.safeParse(value)

        if (parsedVisibility.success) {
          onPreviewChange(parsedVisibility.data)
        }
      }}
    >
      <SelectTrigger className={triggerClassName}>
        <ResourceVisibilityIcon
          className="h-4 w-4"
          visibility={currentVisibility}
        />
        <span className="text-sm font-medium leading-5">
          Visibility: {formatVisibility(currentVisibility)}
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            <span className="inline-flex items-center gap-2">
              <ResourceVisibilityIcon className="h-4 w-4" visibility={option} />
              {formatVisibility(option)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const getResourceVisibilityChangeSummary = (
  resourceLabel: string,
  visibility: ResourceVisibility,
): string => {
  const label = resourceLabel.toLowerCase()

  switch (visibility) {
    case 'private':
      return `This will keep the ${label} inside its organization and may break externally visible dependents.`
    case 'public':
      return `This will make the ${label} readable to anyone with the link.`
    case 'global':
      return `This will make the ${label} readable to anyone and list it across organizations and in the public explorer.`
    default:
      return visibility
  }
}

export function ResourceTitleBlock({
  description,
  extra,
  title,
  visibility,
}: {
  description?: ReactNode
  extra?: ReactNode
  title: ReactNode
  visibility?: ResourceVisibility | null
}) {
  return (
    <div className="flex max-w-[720px] flex-1 flex-col gap-1">
      <h1 className="text-xl font-semibold leading-7 text-card-foreground">
        {title}
      </h1>
      {description ? (
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium leading-5 text-muted-foreground">
        {visibility ? (
          <span className="inline-flex items-center gap-1">
            <ResourceVisibilityIcon
              className="h-3 w-3"
              visibility={visibility}
            />
            {formatVisibility(visibility)}
          </span>
        ) : null}
        {extra}
      </div>
    </div>
  )
}

export function OverviewSection({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <section className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-base font-medium leading-6 text-foreground">
        {title}
      </h2>
      <div className="mt-2 text-base font-normal leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export function OverviewText({ children }: { children: ReactNode }) {
  return <div className="whitespace-pre-line">{children}</div>
}
