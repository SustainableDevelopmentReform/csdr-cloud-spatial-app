import { auth } from '~/lib/auth'
import { createMiddleware } from 'hono/factory'
import { ServerError } from '../lib/error'

interface AuthMiddlewareOptions {
  permission: string
}

export const authMiddleware = (options: AuthMiddlewareOptions) =>
  createMiddleware<{
    Variables: {
      userId: string
    }
    Bindings: any
  }>(async (c, next) => {
    // Use better-auth's session management
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new ServerError({
        statusCode: 401,
        message: 'User is not authenticated',
      })
    }

    // Allow all read permissions to logged in users
    if (options.permission.startsWith('read:')) {
      return await next()
    }

    if (session.user.role === 'admin') {
      return await next()
    }

    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  })

// async function checkPermission(
//   permission: string | ((permissions: Permission[]) => boolean),
//   userId: number,
// ) {
//   const userPermissions = await getPermissionByUserId(userId)

//   const defaultOrgPermission = userPermissions.find(
//     ({ isDefaultOrg }) => isDefaultOrg,
//   )

//   if (!defaultOrgPermission) {
//     return false
//   }

//   if (typeof permission === 'string') {
//     const isGranted = defaultOrgPermission.permissions.some((perm: any) => {
//       return perm.key === permission
//     })
//     return isGranted
//   }

//   return permission(defaultOrgPermission.permissions)
// }
