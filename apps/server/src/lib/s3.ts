import { S3Client } from '@aws-sdk/client-s3'
import { env } from '~/env'

const region =
  env.AWS_REGION ??
  env.AWS_DEFAULT_REGION ??
  (env.S3_SPACES_ENDPOINT ? 'us-east-1' : undefined)

const buildS3Client = () => {
  const clientOptions = {
    ...(region ? { region } : {}),
    ...(env.S3_SPACES_ENDPOINT
      ? {
          endpoint: env.S3_SPACES_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
        }
      : {}),
  }

  const accessKeyId = env.S3_SPACES_ACCESS_KEY_ID
  const secretAccessKey = env.S3_SPACES_SECRET_KEY

  if (!accessKeyId || !secretAccessKey) {
    return new S3Client(clientOptions)
  }

  return new S3Client({
    ...clientOptions,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export const s3Client = buildS3Client()
