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
import { useWorkflow } from '../_hooks'
import { WorkflowButton } from './workflow-button'

export const WorkflowBreadcrumbs = () => {
  const pathname = usePathname()
  let maybeWorkflowId = pathname.split('/').pop()
  if (maybeWorkflowId === 'workflow') maybeWorkflowId = undefined

  const { data: workflowFromUrl } = useWorkflow(maybeWorkflowId)

  const workflow = workflowFromUrl

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
        {workflow && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <WorkflowButton workflow={workflow} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
