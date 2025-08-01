import { S3Client } from '@aws-sdk/client-s3'
import { env } from '~/env'

export const s3Client =
  env.S3_SPACES_ENDPOINT &&
  env.S3_SPACES_ACCESS_KEY_ID &&
  env.S3_SPACES_SECRET_KEY
    ? new S3Client({
        region: 'us-east-1',
        endpoint: env.S3_SPACES_ENDPOINT,
        forcePathStyle: false,
        credentials: {
          accessKeyId: env.S3_SPACES_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SPACES_SECRET_KEY,
        },
      })
    : null
