import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { createAuthClient } from './authClient'
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

    const [activeMemberJson, activeOrganizationJson, organizationsJson] =
      await Promise.all([
        fetchAuthEndpoint('/organization/get-active-member'),
        fetchAuthEndpoint('/organization/get-full-organization'),
        fetchAuthEndpoint('/organization/list'),
      ])
    const activeMemberResult = activeMemberSchema.safeParse(activeMemberJson)
    const activeOrganizationResult = organizationSummarySchema.safeParse(
      activeOrganizationJson,
    )
    const organizationsResult =
      organizationListSchema.safeParse(organizationsJson)

    return {
      user: res.data?.user ?? null,
      session: res.data?.session ?? null,
      activeMember: activeMemberResult.success ? activeMemberResult.data : null,
      activeOrganization: activeOrganizationResult.success
        ? activeOrganizationResult.data
        : null,
      organizations: organizationsResult.success
        ? organizationsResult.data
        : [],
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
