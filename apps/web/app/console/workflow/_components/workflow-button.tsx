import { BadgeLink } from '../../../../components/badge-link'
import { WorkflowLinkParams, useWorkflowLink } from '../_hooks'

export const WorkflowButtons = ({
  workflowSets,
}: {
  workflowsSets: WorkflowLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {workflowSets?.map((workflow) => (
        <WorkflowButton workflow={workflow} key={workflow.id} />
      ))}
    </div>
  )
}

export const WorkflowButton = ({
  workflow,
}: {
  workflow: WorkflowLinkParams
}) => {
  const workflowLink = useWorkflowLink()

  return (
    <BadgeLink href={workflowLink(workflow)} variant="workflow">
      {workflow.name}
    </BadgeLink>
  )
}
