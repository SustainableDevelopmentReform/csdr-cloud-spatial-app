import { Hono } from 'hono'
import { compress } from 'hono/compress'
// import user from './routes/user'
// import role from './routes/role'
// import permission from './routes/permission'
// import organization from './routes/organization'
import file from './routes/file'
// import featureFlag from './routes/feature-flag'
import { logger } from './middlewares/logger'
import { ServerError } from './lib/error'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from './middlewares/rate-limiter'
import { env } from './env'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { auth, AuthType } from './lib/auth'
import { cors } from 'hono/cors'

const isProduction = env.NODE_ENV === 'production'

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
})

app.use(compress())
app.use(logger())
app.use(
  cors({
    origin: ['http://localhost:3000'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposeHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', secureHeaders())
app.use('*', rateLimiter())

app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)

  return next()
})

// Mount the better-auth handler for all auth endpoints
// This will handle all authentication routes like sign-in, sign-up, etc.
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

const apiRoutes = app.basePath('/api/v1/').route('/file', file)

app.get('/api/v1/healthcheck', (c) => c.json({ message: 'OK' }))

app.onError(async (err, c) => {
  if (err instanceof ServerError) {
    const error = err as InstanceType<typeof ServerError>
    return c.json(
      error.response,
      error.response.statusCode as ContentfulStatusCode,
    )
  }

  console.error(err)

  if (err instanceof Error) {
    const error: Error = err
    return c.json(
      {
        statusCode: 500,
        message: 'Internal Server Error',
        description: error.message,
        data: isProduction
          ? null
          : {
              cause: error.cause,
              stack: error.stack,
            },
      },
      500,
    )
  }

  return c.json(
    {
      statusCode: 500,
      message: 'Internal Server Error',
      data: isProduction ? null : err,
    },
    500,
  )
})

app.notFound(async (c) => {
  return c.json({
    message: "Endpoint you're looking for is not found",
    data: null,
  })
})

export type ApiRoutesType = typeof apiRoutes
export default app as ApiRoutesType
