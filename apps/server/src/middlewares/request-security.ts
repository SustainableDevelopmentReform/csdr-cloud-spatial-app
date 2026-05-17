import { createMiddleware } from 'hono/factory'
import { env } from '~/env'
import type { AuthType } from '~/lib/auth'
import { ServerError } from '~/lib/error'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const browserSimpleContentTypes = new Set([
  'application/x-www-form-urlencoded',
  'text/plain',
])
const defaultBodyLimitBytes = 25 * 1024 * 1024
const multipartBodyLimitBytes = 250 * 1024 * 1024

const hasCookieHeader = (headers: Headers): boolean => {
  const cookieHeader = headers.get('cookie')

  return typeof cookieHeader === 'string' && cookieHeader.trim().length > 0
}

const getHeaderOrigin = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const getContentTypeEssence = (headers: Headers): string | null => {
  const contentType = headers.get('content-type')

  if (!contentType) {
    return null
  }

  return contentType.split(';')[0]?.trim().toLowerCase() ?? null
}

const getRequestBodyLimit = (headers: Headers): number => {
  const contentType = getContentTypeEssence(headers)

  return contentType === 'multipart/form-data'
    ? multipartBodyLimitBytes
    : defaultBodyLimitBytes
}

export const requestBodyLimitMiddleware = createMiddleware<{
  Variables: AuthType
}>(async (c, next) => {
  if (!unsafeMethods.has(c.req.method.toUpperCase())) {
    return next()
  }

  const contentLength = c.req.raw.headers.get('content-length')

  if (!contentLength) {
    return next()
  }

  const parsedLength = Number(contentLength)

  if (
    !Number.isFinite(parsedLength) ||
    parsedLength < 0 ||
    parsedLength > getRequestBodyLimit(c.req.raw.headers)
  ) {
    throw new ServerError({
      statusCode: 413,
      message: 'Payload Too Large',
      description: 'Request body exceeds the configured size limit.',
    })
  }

  return next()
})

export const csrfMiddleware = createMiddleware<{
  Variables: AuthType
}>(async (c, next) => {
  if (
    !c.req.path.startsWith('/api/v0/') ||
    !unsafeMethods.has(c.req.method.toUpperCase()) ||
    c.req.raw.headers.has('x-api-key') ||
    !hasCookieHeader(c.req.raw.headers)
  ) {
    return next()
  }

  const contentType = getContentTypeEssence(c.req.raw.headers)

  if (contentType && browserSimpleContentTypes.has(contentType)) {
    throw new ServerError({
      statusCode: 403,
      message: 'CSRF validation failed',
      description:
        'Cookie-authenticated API requests must use a non-simple content type.',
    })
  }

  const origin =
    getHeaderOrigin(c.req.raw.headers.get('origin')) ??
    getHeaderOrigin(c.req.raw.headers.get('referer'))

  if (!origin || !env.TRUSTED_ORIGINS.includes(origin)) {
    throw new ServerError({
      statusCode: 403,
      message: 'CSRF validation failed',
      description:
        'Cookie-authenticated API requests must come from a trusted origin.',
    })
  }

  return next()
})
