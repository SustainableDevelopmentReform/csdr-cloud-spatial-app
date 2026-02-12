'use client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import Link from '../../../../components/link'
import { WORKFLOWS_BASE_PATH } from '../../../../lib/paths'
import { useWorkflows } from '../_hooks'
import { WorkflowsButton } from './workflows-button'

export const WorkflowsBreadcrumbs = () => {
  const pathname = usePathname()

  const { data: workflowsFromUrl } = useWorkflows()

  const workflows = workflowsFromUrl

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={WORKFLOWS_BASE_PATH}>Workflows</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {workflows && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <WorkflowsButton workflows={workflows} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
