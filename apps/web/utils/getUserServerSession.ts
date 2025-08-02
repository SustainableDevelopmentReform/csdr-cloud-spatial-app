import { cookies, headers } from 'next/headers'
import { authClient } from './auth'

export const getUserServerSession = async () => {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Get all cookies as a string
  const cookieString = cookieStore.toString()

  const res = await authClient.getSession({
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
}
