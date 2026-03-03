import { AuthType } from '~/lib/auth'
import { createMiddleware } from 'hono/factory'
import { ServerError } from '../lib/error'

interface AuthMiddlewareOptions {
  permission: string
}

export const authMiddleware = (options: AuthMiddlewareOptions) =>
  createMiddleware<{
    Variables: AuthType
  }>(async (c, next) => {
    const user = c.get('user')
    const session = c.get('session')

    if (!session || !user) {
      throw new ServerError({
        statusCode: 401,
        message: 'User is not authenticated',
      })
    }

    if (options.permission.startsWith('read:')) {
      return await next()
    }

    if (user.role === 'admin') {
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
