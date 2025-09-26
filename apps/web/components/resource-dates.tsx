import { formatDateTime } from '../utils/date'

export const ResourceDates = ({
  resource,
}: {
  resource: { createdAt: string; updatedAt: string }
}) => {
  return (
    <div>
      <p>Created at: {formatDateTime(resource.createdAt)}</p>
      <p>Updated at: {formatDateTime(resource.updatedAt)}</p>
    </div>
  )
}
