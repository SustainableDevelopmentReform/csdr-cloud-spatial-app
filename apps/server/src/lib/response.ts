import { type Context } from 'hono'
import { ContentfulStatusCode } from 'hono/utils/http-status'

type Data<T> = T extends null | undefined ? null : T

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
      data: (data ?? null) as Data<T>,
    },
    statusCode,
  )
