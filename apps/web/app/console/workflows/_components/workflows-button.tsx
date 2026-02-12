import { BadgeLink } from '../../../../components/badge-link'
import { WorkflowsLinkParams, useWorkflowsLink } from '../_hooks'

export const WorkflowsButtons = ({
  workflowsSets,
}: {
  workflowsSets: WorkflowsLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {workflowsSets?.map((workflows) => (
        <WorkflowsButton workflows={workflows} key={workflows.id} />
      ))}
    </div>
  )
}

export const WorkflowsButton = ({
  workflows,
}: {
  workflows: WorkflowsLinkParams
}) => {
  const workflowsLink = useWorkflowsLink()

  return (
    <BadgeLink href={workflowsLink(workflows)} variant="workflows">
      {workflows.name}
    </BadgeLink>
  )
}
