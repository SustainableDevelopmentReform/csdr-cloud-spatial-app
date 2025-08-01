import { Hono } from 'hono'
import { compress } from 'hono/compress'
// import user from './routes/user'
// import role from './routes/role'
// import permission from './routes/permission'
// import organization from './routes/organization'
import file from './routes/file'
import authRoutes from './routes/auth'
// import featureFlag from './routes/feature-flag'
import { logger } from './middlewares/logger'
import { ServerError } from './lib/error'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from './middlewares/rate-limiter'
import { env } from './env'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { auth, AuthType } from './lib/auth'

const isProduction = env.NODE_ENV === 'production'

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
})

app.use(compress())
app.use(logger())

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

const apiRoutes = app
  .basePath('/api/v1/')
  .route('/file', file)
  // Note: auth routes are handled by better-auth - they won't have types - but you should use better-auth/react client for this
  .route('/auth', authRoutes)

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
