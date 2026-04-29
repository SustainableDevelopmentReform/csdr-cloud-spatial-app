import { randomUUID } from 'node:crypto'
import { createMiddleware } from 'hono/factory'
import { appLogger } from '~/lib/logger'

const REQUEST_ID_HEADER = 'x-request-id'

const shouldLogRequest = (path: string): boolean =>
  !/\.(svg|png|jpg|webp|jpeg|js|css|wasm|ico)$/.test(path) &&
  !path.endsWith('/healthcheck')

export const logger = () =>
  createMiddleware(async (c, next) => {
    const requestId = c.req.header(REQUEST_ID_HEADER) ?? randomUUID()
    c.set('requestId', requestId)
    c.header(REQUEST_ID_HEADER, requestId)

    if (!shouldLogRequest(c.req.path)) {
      await next()
      return
    }

    const { method, path } = c.req
    const ip =
      c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null
    const start = Date.now()

    appLogger.info('request_started', {
      requestId,
      method,
      path,
      ip,
    })

    try {
      await next()
    } catch (error) {
      appLogger.error('request_failed', {
        requestId,
        method,
        path,
        ip,
        durationMs: Date.now() - start,
        error,
      })
      throw error
    }

    appLogger.info('request_completed', {
      requestId,
      method,
      path,
      statusCode: c.res.status,
      ip,
      durationMs: Date.now() - start,
    })
  })
