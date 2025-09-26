import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { createRoute, z } from '@hono/zod-openapi'
import { authMiddleware } from '../middlewares/auth'
import { s3Client } from '~/lib/s3'
import { generateJsonResponse } from '../lib/response'
import { env } from '~/env'
import { ServerError } from '../lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'

const app = createOpenAPIApp().openapi(
  createRoute({
    description: 'Get a presigned URL for direct uploads.',
    method: 'post',
    path: '/get-presigned-url',
    middleware: [
      authMiddleware({
        permission: 'write:files',
      }),
    ],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              fileKey: z
                .string()
                .min(1)
                .openapi({ example: 'uploads/image.png' }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description:
          'Successfully returned a presigned URL for direct uploads.',
        content: {
          'application/json': {
            schema: createResponseSchema(
              z.object({
                url: z
                  .string()
                  .url()
                  .openapi({ example: 'https://s3.amazonaws.com/bucket/key' }),
              }),
            ),
          },
        },
      },
      401: jsonErrorResponse('Unauthorized'),
      422: validationErrorResponse,
      500: jsonErrorResponse('Failed to create presigned URL'),
    },
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

    return generateJsonResponse(c, { url }, 200)
  },
)

export default app
