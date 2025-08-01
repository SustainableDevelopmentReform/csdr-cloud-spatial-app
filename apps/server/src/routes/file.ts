import { Hono } from 'hono'
import { authMiddleware } from '../middlewares/auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '~/lib/s3'
import { generateJsonResponse } from '../lib/response'
import { env } from '~/env'
import { ServerError } from '../lib/error'

const app = new Hono().post(
  '/get-presigned-url',
  zValidator('json', z.object({ fileKey: z.string() })),
  authMiddleware({
    permission: 'write:files',
  }),
  async (c) => {
    if (!s3Client) {
      throw new ServerError({
        statusCode: 500,
        message: 'S3 client not initialized',
      })
    }

    const { fileKey } = c.req.valid('json')

    const putObjectCommand = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: `sidrstudio/${fileKey}`,
      ACL: 'public-read',
    })

    const url = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 15 * 60,
    })

    return generateJsonResponse(c, { url })
  },
)

export default app
