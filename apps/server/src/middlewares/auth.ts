import { createMiddleware } from 'hono/factory'
import type {
  PermissionResourceType,
  RouteAccessScope,
} from '~/lib/authorization'
import { runAuthorizationMiddleware } from '~/lib/authorization'
import type { AuthType } from '~/lib/auth'

interface AuthMiddlewareOptions {
  permission: string
  scope?: RouteAccessScope
  skipResourceCheck?: boolean
  targetResource?: PermissionResourceType
}

export const authMiddleware = (options: AuthMiddlewareOptions) =>
  createMiddleware<{
    Variables: AuthType
  }>(async (c, next) =>
    runAuthorizationMiddleware(
      c,
      options.permission,
      next,
      options.scope ?? 'console',
      options.targetResource,
      options.skipResourceCheck ?? false,
    ),
  )
