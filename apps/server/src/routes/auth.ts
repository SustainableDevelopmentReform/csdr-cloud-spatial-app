import { auth, AuthType } from '~/lib/auth'
import { Hono } from 'hono'

// Create a new Hono app instance for auth routes
const router = new Hono<{ Bindings: AuthType }>({
  strict: false,
})

// Mount the better-auth handler for all auth endpoints
// This will handle all authentication routes like sign-in, sign-up, etc.
router.on(['POST', 'GET'], '/*', (c) => {
  return auth.handler(c.req.raw)
})

export default router
