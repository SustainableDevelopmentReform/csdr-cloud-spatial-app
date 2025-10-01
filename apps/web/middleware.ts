import { NextResponse, type NextRequest } from 'next/server'
import { env } from './env'

const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/console')
}

export async function middleware(request: NextRequest) {
  if (!env.APP_URL) {
    throw new Error('APP_URL is not set')
  }

  const session =
    request.cookies.get('session_token') ??
    request.cookies.get('__Secure-better-auth.session_token')

  const { pathname } = request.nextUrl

  if (!session && isProtectedRoute(pathname)) {
    console.log('protected route')
    return NextResponse.rewrite(
      new URL('/not-found', env.INTERNAL_FRONTEND_URL ?? env.APP_URL),
    )
  }

  const headers = new Headers()

  const userAgent = request.headers.get('User-Agent')
  const xRealIp = request.headers.get('x-real-ip') || 'anon'
  const xForwardedFor =
    request.headers.get('x-forwarded-for')?.split(',')[0] || 'anon'

  headers.set('x-real-ip', xRealIp)
  headers.set('x-forwarded-for', xForwardedFor)

  headers.set('Cookie', request.cookies.toString())
  if (userAgent) {
    headers.set('User-Agent', userAgent)
  }

  try {
    const nextFn = NextResponse.next()

    return nextFn
  } catch (error) {
    console.log('error', error)
    if (isProtectedRoute(pathname)) {
      return NextResponse.rewrite(
        new URL('/not-found', env.INTERNAL_FRONTEND_URL ?? env.APP_URL),
      )
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
