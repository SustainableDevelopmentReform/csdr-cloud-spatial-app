import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createAuthClient } from './auth-client'
import { env } from '../env'
import { activeMemberSchema, organizationSummarySchema } from './access-control'

const organizationListSchema = z.array(organizationSummarySchema)

const authBaseUrl = env.INTERNAL_BACKEND_URL ?? env.APP_URL

async function fetchAuthEndpoint(path: string) {
  const cookieStore = await cookies()
  const headersList = await headers()

  const response = await fetch(`${authBaseUrl}/api/auth${path}`, {
    cache: 'no-store',
    headers: {
      cookie: cookieStore.toString(),
      'x-forwarded-for': headersList.get('x-forwarded-for') || '',
      'x-real-ip': headersList.get('x-real-ip') || '',
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export const getUserServerSession = async () => {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Get all cookies as a string
  const cookieString = cookieStore.toString()

  try {
    const res = await createAuthClient(authBaseUrl).getSession({
      fetchOptions: {
        throw: false,
        headers: {
          // Forward cookies from the browser request
          cookie: cookieString,
          // Forward other important headers
          'x-forwarded-for': headersList.get('x-forwarded-for') || '',
          'x-real-ip': headersList.get('x-real-ip') || '',
        },
      },
    })
    const user = res.data?.user ?? null
    const session = res.data?.session ?? null

    if (user?.role === 'super_admin') {
      return {
        user,
        session,
        activeMember: null,
        activeOrganization: null,
        organizations: [],
      }
    }

    const [activeMemberJson, organizationsJson] = await Promise.all([
      fetchAuthEndpoint('/organization/get-active-member'),
      fetchAuthEndpoint('/organization/list'),
    ])
    const activeMemberResult = activeMemberSchema.safeParse(activeMemberJson)
    const organizationsResult =
      organizationListSchema.safeParse(organizationsJson)
    const organizations = organizationsResult.success
      ? organizationsResult.data
      : []
    const activeOrganization =
      organizations.find(
        (organization) => organization.id === session?.activeOrganizationId,
      ) ?? null

    return {
      user,
      session,
      activeMember: activeMemberResult.success ? activeMemberResult.data : null,
      activeOrganization,
      organizations,
    }
  } catch (error) {
    console.error(
      'Failed to fetch user session server-side, using URL',
      authBaseUrl,
      error,
    )
    return {
      user: null,
      session: null,
      activeMember: null,
      activeOrganization: null,
      organizations: [],
    }
  }
}
