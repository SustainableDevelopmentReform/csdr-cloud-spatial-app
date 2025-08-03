import { type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const generateJsonResponse = <T>(
  c: Context,
  data?: T,
  statusCode: ContentfulStatusCode = 200,
  message = 'OK',
) =>
  c.json(
    {
      statusCode,
      message,
      data,
    },
    statusCode,
  )
