import { createMiddleware } from 'hono/factory'
import { runAuthorizationMiddleware } from '~/lib/auth/authorization'
import type { AuthType } from '~/lib/auth'

interface AuthMiddlewareOptions {
  allowPublicRead?: boolean
  permission: string
}

export const authMiddleware = (options: AuthMiddlewareOptions) =>
  createMiddleware<{
    Variables: AuthType
  }>(async (c, next) =>
    runAuthorizationMiddleware(c, options.permission, next, {
      allowPublicRead: options.allowPublicRead,
    }),
  )
