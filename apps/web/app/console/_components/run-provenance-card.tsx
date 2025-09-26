import Link from 'next/link'
import { DetailCard } from './detail-cards'

export const SourcesCard = ({
  resource,
}: {
  resource: { sourceUrl?: string; sourceMetadataUrl?: string }
}) => {
  if (!resource.sourceUrl && !resource.sourceMetadataUrl) {
    return null
  }

  return (
    <DetailCard
      title={`Sources`}
      footer={
        <div className="flex flex-col gap-2">
          {resource.sourceUrl && (
            <span>
              Data:{' '}
              <Link
                href={resource.sourceUrl}
                target="_blank"
                className="text-blue-500 underline font-normal font-mono"
              >
                {resource.sourceUrl}
              </Link>
            </span>
          )}
          {resource.sourceMetadataUrl && (
            <span>
              Metadata:{' '}
              <Link
                href={resource.sourceMetadataUrl}
                target="_blank"
                className="text-blue-500 underline font-normal font-mono"
              >
                {resource.sourceMetadataUrl}
              </Link>
            </span>
          )}
        </div>
      }
    />
  )
}
