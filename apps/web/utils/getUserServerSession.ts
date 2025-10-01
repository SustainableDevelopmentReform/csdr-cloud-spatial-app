import { cookies, headers } from 'next/headers'
import { createAuthClient } from './authClient'
import { env } from '../env'

export const getUserServerSession = async () => {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Get all cookies as a string
  const cookieString = cookieStore.toString()

  try {
    const res = await createAuthClient(
      env.INTERNAL_BACKEND_URL ?? env.APP_URL,
    ).getSession({
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

    return { user: res.data?.user, session: res.data?.session }
  } catch (error) {
    console.error(
      'Failed to fetch user session server-side, using URL',
      env.INTERNAL_BACKEND_URL ?? env.APP_URL,
      error,
    )
    return { user: null, session: null }
  }
}
